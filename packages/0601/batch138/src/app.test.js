const request = require('supertest');
const { Pool } = require('pg');
const express = require('express');
const crypto = require('crypto');

let pool;
let app;
let container;
let server;

const PAYMENT_TIMEOUT_MINUTES = 15;

function generateOutTradeNo() {
  const timestamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `BK${timestamp}${rand}`;
}

async function promoteWaitlist(client, courtId, bookingDate, startHour) {
  const next = await client.query(
    `SELECT id, member_phone FROM waitlist
     WHERE court_id = $1 AND booking_date = $2 AND start_hour = $3 AND status = 'waiting'
     ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
    [courtId, bookingDate, startHour]
  );
  if (next.rows.length === 0) return null;

  const waitlistItem = next.rows[0];

  const bookingResult = await client.query(
    `INSERT INTO bookings (court_id, booking_date, start_hour, member_phone, payment_status)
     VALUES ($1, $2, $3, $4, 'unpaid')
     RETURNING id, court_id, booking_date, start_hour, member_phone, created_at`,
    [courtId, bookingDate, startHour, waitlistItem.member_phone]
  );

  await client.query(
    `UPDATE waitlist SET status = 'notified', notified_at = NOW() WHERE id = $1`,
    [waitlistItem.id]
  );

  await client.query(
    `INSERT INTO payments (booking_id, out_trade_no, total_fee, status)
     VALUES ($1, $2, 5000, 'pending')`,
    [bookingResult.rows[0].id, generateOutTradeNo()]
  );

  return {
    waitlistId: waitlistItem.id,
    booking: bookingResult.rows[0],
  };
}

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/courts/available', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      const { date } = req.query;
      if (!date) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '请提供查询日期 (date 参数)' });
      }
      const courtsResult = await client.query(
        'SELECT id, court_number, name FROM courts WHERE is_active = true ORDER BY court_number'
      );
      const courts = courtsResult.rows;
      const bookingsResult = await client.query(
        'SELECT court_id, start_hour, payment_status FROM bookings WHERE booking_date = $1',
        [date]
      );
      const bookedSlots = new Map();
      bookingsResult.rows.forEach(b => {
        if (b.payment_status === 'cancelled') return;
        if (!bookedSlots.has(b.court_id)) bookedSlots.set(b.court_id, new Map());
        bookedSlots.get(b.court_id).set(b.start_hour, b.payment_status);
      });
      const waitlistResult = await client.query(
        `SELECT court_id, start_hour, COUNT(*)::int AS wait_count
         FROM waitlist WHERE booking_date = $1 AND status = 'waiting'
         GROUP BY court_id, start_hour`,
        [date]
      );
      const waitlistMap = new Map();
      waitlistResult.rows.forEach(w => {
        const key = `${w.court_id}:${w.start_hour}`;
        waitlistMap.set(key, w.wait_count);
      });
      const businessHours = Array.from({ length: 14 }, (_, i) => i + 8);
      const availableCourts = courts.map(court => {
        const booked = bookedSlots.get(court.id) || new Map();
        const availableHours = businessHours.filter(hour => !booked.has(hour));
        const bookedInfo = [];
        booked.forEach((status, hour) => {
          const key = `${court.id}:${hour}`;
          bookedInfo.push({ hour, paymentStatus: status, waitlistCount: waitlistMap.get(key) || 0 });
        });
        return {
          id: court.id,
          courtNumber: court.court_number,
          name: court.name,
          availableHours,
          bookedSlots: bookedInfo,
        };
      });
      await client.query('COMMIT');
      res.json({ date, businessHours, courts: availableCourts });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('查询空闲场地失败:', error);
      res.status(500).json({ error: '服务器内部错误' });
    } finally {
      client.release();
    }
  });

  app.post('/api/bookings', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      const { courtNumber, date, startHour, memberPhone } = req.body;
      if (!courtNumber || !date || startHour === undefined || !memberPhone) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '请提供完整信息: courtNumber, date, startHour, memberPhone' });
      }
      if (startHour < 8 || startHour > 21) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '预订时段仅限 8:00-21:00' });
      }
      const courtResult = await client.query(
        'SELECT id FROM courts WHERE court_number = $1 AND is_active = true FOR UPDATE',
        [courtNumber]
      );
      if (courtResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '场地不存在' });
      }
      const courtId = courtResult.rows[0].id;
      const existingBooking = await client.query(
        `SELECT id, payment_status FROM bookings
         WHERE court_id = $1 AND booking_date = $2 AND start_hour = $3
         AND payment_status != 'cancelled' FOR UPDATE`,
        [courtId, date, startHour]
      );
      if (existingBooking.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: '该时段已被预订' });
      }
      const result = await client.query(
        `INSERT INTO bookings (court_id, booking_date, start_hour, member_phone, payment_status)
         VALUES ($1, $2, $3, $4, 'unpaid')
         RETURNING id, court_id, booking_date, start_hour, member_phone, payment_status, created_at`,
        [courtId, date, startHour, memberPhone]
      );
      const booking = result.rows[0];
      const outTradeNo = generateOutTradeNo();
      await client.query(
        `INSERT INTO payments (booking_id, out_trade_no, total_fee, status)
         VALUES ($1, $2, 5000, 'pending')`,
        [booking.id, outTradeNo]
      );
      await client.query('COMMIT');
      res.status(201).json({
        id: booking.id,
        courtNumber,
        date: booking.booking_date,
        startHour: booking.start_hour,
        endHour: booking.start_hour + 1,
        memberPhone: booking.member_phone,
        paymentStatus: booking.payment_status,
        outTradeNo,
        createdAt: booking.created_at,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') return res.status(409).json({ error: '该时段已被预订' });
      if (error.code === '40001') return res.status(409).json({ error: '预订冲突，请重试' });
      res.status(500).json({ error: '服务器内部错误' });
    } finally {
      client.release();
    }
  });

  app.delete('/api/bookings/:id', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      const { id } = req.params;
      const bookingResult = await client.query(
        `SELECT id, court_id, booking_date, start_hour, payment_status, group_booking_id
         FROM bookings WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (bookingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '预订记录不存在' });
      }
      const booking = bookingResult.rows[0];
      await client.query(
        `UPDATE bookings SET payment_status = 'cancelled' WHERE id = $1`,
        [id]
      );
      await client.query(
        `UPDATE payments SET status = 'cancelled' WHERE booking_id = $1`,
        [id]
      );
      const promoted = await promoteWaitlist(client, booking.court_id, booking.booking_date, booking.start_hour);
      await client.query('COMMIT');
      res.json({
        message: '取消预订成功',
        bookingId: id,
        waitlistPromoted: promoted ? { waitlistId: promoted.waitlistId, newBookingId: promoted.booking.id } : null,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '40001') return res.status(409).json({ error: '操作冲突，请重试' });
      res.status(500).json({ error: '服务器内部错误' });
    } finally {
      client.release();
    }
  });

  app.post('/api/waitlist', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      const { courtNumber, date, startHour, memberPhone } = req.body;
      const courtResult = await client.query(
        'SELECT id FROM courts WHERE court_number = $1 AND is_active = true FOR UPDATE',
        [courtNumber]
      );
      const courtId = courtResult.rows[0].id;
      const existingWaitlist = await client.query(
        `SELECT id FROM waitlist
         WHERE court_id = $1 AND booking_date = $2 AND start_hour = $3
         AND member_phone = $4 AND status = 'waiting'`,
        [courtId, date, startHour, memberPhone]
      );
      if (existingWaitlist.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: '您已在候补队列中' });
      }
      const positionResult = await client.query(
        `SELECT COUNT(*)::int AS position FROM waitlist
         WHERE court_id = $1 AND booking_date = $2 AND start_hour = $3 AND status = 'waiting'`,
        [courtId, date, startHour]
      );
      const result = await client.query(
        `INSERT INTO waitlist (court_id, booking_date, start_hour, member_phone, status)
         VALUES ($1, $2, $3, $4, 'waiting')
         RETURNING id, court_id, booking_date, start_hour, member_phone, status, created_at`,
        [courtId, date, startHour, memberPhone]
      );
      await client.query('COMMIT');
      res.status(201).json({
        id: result.rows[0].id,
        courtNumber,
        date: result.rows[0].booking_date,
        startHour: result.rows[0].start_hour,
        memberPhone: result.rows[0].member_phone,
        position: positionResult.rows[0].position + 1,
        status: result.rows[0].status,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: '服务器内部错误' });
    } finally {
      client.release();
    }
  });

  app.post('/api/payments/wechat/callback', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      const callbackData = req.body;
      const {
        out_trade_no: outTradeNo,
        transaction_id: transactionId,
        result_code: resultCode,
        return_code: returnCode,
        total_fee: totalFee,
      } = callbackData;
      if (!outTradeNo) {
        await client.query('ROLLBACK');
        return res.json({ return_code: 'FAIL', return_msg: '缺少商户订单号' });
      }
      if (returnCode === 'SUCCESS' && resultCode === 'SUCCESS') {
        const paymentResult = await client.query(
          `SELECT id, booking_id, group_booking_id, status, total_fee FROM payments
           WHERE out_trade_no = $1 FOR UPDATE`,
          [outTradeNo]
        );
        if (paymentResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.json({ return_code: 'FAIL', return_msg: '订单不存在' });
        }
        const payment = paymentResult.rows[0];
        if (payment.status === 'paid') {
          await client.query('COMMIT');
          return res.json({ return_code: 'SUCCESS', return_msg: 'OK' });
        }
        if (payment.status === 'cancelled') {
          await client.query('ROLLBACK');
          return res.json({ return_code: 'FAIL', return_msg: '订单已取消' });
        }
        await client.query(
          `UPDATE payments SET status = 'paid', transaction_id = $1, paid_at = NOW()
           WHERE id = $2`,
          [transactionId, payment.id]
        );
        if (payment.booking_id) {
          await client.query(
            `UPDATE bookings SET payment_status = 'paid' WHERE id = $1`,
            [payment.booking_id]
          );
        }
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
      }
      res.json({ return_code: 'SUCCESS', return_msg: 'OK' });
    } catch (error) {
      await client.query('ROLLBACK');
      res.json({ return_code: 'FAIL', return_msg: '系统异常' });
    } finally {
      client.release();
    }
  });

  return app;
}

beforeAll(async () => {
  const { PostgreSqlContainer } = require('@testcontainers/postgresql');
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_pass')
    .start();

  const port = container.getMappedPort(5432);
  const host = container.getHost();

  pool = new Pool({
    host,
    port,
    database: 'test_db',
    user: 'test_user',
    password: 'test_pass',
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courts (
      id SERIAL PRIMARY KEY,
      court_number VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(50),
      is_active BOOLEAN DEFAULT true
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      court_id INTEGER REFERENCES courts(id) NOT NULL,
      booking_date DATE NOT NULL,
      start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
      member_phone VARCHAR(20) NOT NULL,
      payment_status VARCHAR(20) DEFAULT 'unpaid',
      group_booking_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(court_id, booking_date, start_hour)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id SERIAL PRIMARY KEY,
      court_id INTEGER REFERENCES courts(id) NOT NULL,
      booking_date DATE NOT NULL,
      start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
      member_phone VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'waiting',
      notified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER REFERENCES bookings(id),
      group_booking_id INTEGER,
      out_trade_no VARCHAR(64) UNIQUE NOT NULL,
      transaction_id VARCHAR(64),
      total_fee INTEGER NOT NULL,
      pay_method VARCHAR(20) DEFAULT 'wechat',
      status VARCHAR(20) DEFAULT 'pending',
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const courtNumbers = ['1号', '2号', '3号', '4号', '5号', '6号'];
  for (const num of courtNumbers) {
    await pool.query(
      'INSERT INTO courts (court_number, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [num, `${num}场地`]
    );
  }

  app = createApp();
  server = app.listen(0);
  agent = request(server);
}, 120000);

afterAll(async () => {
  if (server) server.close();
  if (pool) await pool.end();
  if (container) await container.stop();
});

test('并发 10 人抢同一场地只能 1 成功', async () => {
  const TEST_DATE = '2026-06-15';
  const promises = [];

  for (let i = 0; i < 10; i++) {
    promises.push(
      request(server)
        .post('/api/bookings')
        .send({
          courtNumber: '1号',
          date: TEST_DATE,
          startHour: 10,
          memberPhone: `1380000000${i}`,
        })
    );
  }

  const results = await Promise.allSettled(promises);

  const successResponses = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.statusCode === 201);

  const conflictResponses = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.statusCode === 409);

  expect(successResponses.length).toBe(1);
  expect(conflictResponses.length + successResponses.length).toBe(10);
}, 60000);

test('取消后 GET 空闲显示已释放', async () => {
  const TEST_DATE = '2026-06-16';

  const bookingResp = await request(server)
    .post('/api/bookings')
    .send({
      courtNumber: '2号',
      date: TEST_DATE,
      startHour: 14,
      memberPhone: '13900000001',
    });

  expect(bookingResp.statusCode).toBe(201);
  const bookingId = bookingResp.body.id;

  const availBefore = await request(server)
    .get('/api/courts/available')
    .query({ date: TEST_DATE });

  const court2Before = availBefore.body.courts.find(c => c.courtNumber === '2号');
  expect(court2Before.availableHours).not.toContain(14);

  const cancelResp = await request(server)
    .delete(`/api/bookings/${bookingId}`);

  expect(cancelResp.statusCode).toBe(200);

  const availAfter = await request(server)
    .get('/api/courts/available')
    .query({ date: TEST_DATE });

  const court2After = availAfter.body.courts.find(c => c.courtNumber === '2号');
  expect(court2After.availableHours).toContain(14);
});

test('微信支付回调 mock 确认支付成功', async () => {
  const TEST_DATE = '2026-06-17';

  const bookingResp = await request(server)
    .post('/api/bookings')
    .send({
      courtNumber: '3号',
      date: TEST_DATE,
      startHour: 18,
      memberPhone: '13700000001',
    });

  expect(bookingResp.statusCode).toBe(201);
  const { outTradeNo } = bookingResp.body;

  const mockCallbackResp = await request(server)
    .post('/api/payments/wechat/callback')
    .send({
      out_trade_no: outTradeNo,
      transaction_id: 'mock_wx_transaction_001',
      result_code: 'SUCCESS',
      return_code: 'SUCCESS',
      total_fee: 5000,
    });

  expect(mockCallbackResp.body.return_code).toBe('SUCCESS');

  const verifyResp = await request(server)
    .get('/api/courts/available')
    .query({ date: TEST_DATE });

  const court3 = verifyResp.body.courts.find(c => c.courtNumber === '3号');
  const bookedSlot = court3.bookedSlots.find(s => s.hour === 18);
  expect(bookedSlot).toBeDefined();
  expect(bookedSlot.paymentStatus).toBe('paid');
});

test('取消预订自动候补下一位', async () => {
  const TEST_DATE = '2026-06-18';

  const firstBooking = await request(server)
    .post('/api/bookings')
    .send({
      courtNumber: '4号',
      date: TEST_DATE,
      startHour: 9,
      memberPhone: '13600000001',
    });
  expect(firstBooking.statusCode).toBe(201);
  const firstBookingId = firstBooking.body.id;
  const firstOutTradeNo = firstBooking.body.outTradeNo;

  await request(server)
    .post('/api/payments/wechat/callback')
    .send({
      out_trade_no: firstOutTradeNo,
      transaction_id: 'mock_002',
      result_code: 'SUCCESS',
      return_code: 'SUCCESS',
      total_fee: 5000,
    });

  const waitlistResp = await request(server)
    .post('/api/waitlist')
    .send({
      courtNumber: '4号',
      date: TEST_DATE,
      startHour: 9,
      memberPhone: '13600000002',
    });
  expect(waitlistResp.statusCode).toBe(201);

  const cancelResp = await request(server)
    .delete(`/api/bookings/${firstBookingId}`);
  expect(cancelResp.statusCode).toBe(200);

  const verifyAvail = await request(server)
    .get('/api/courts/available')
    .query({ date: TEST_DATE });

  const court4 = verifyAvail.body.courts.find(c => c.courtNumber === '4号');
  const bookedSlot = court4.bookedSlots.find(s => s.hour === 9);
  expect(bookedSlot).toBeDefined();
  expect(cancelResp.body.waitlistPromoted).not.toBeNull();
});
