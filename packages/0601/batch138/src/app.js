const express = require('express');
const crypto = require('crypto');
const pool = require('./database/config');

const app = express();
const PORT = process.env.PORT || 3000;
const PAYMENT_TIMEOUT_MINUTES = 15;
const WECHAT_PAY_KEY = process.env.WECHAT_PAY_KEY || 'default_key_for_dev_only';

app.use(express.json());

function generateOutTradeNo() {
  const timestamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `BK${timestamp}${rand}`;
}

function verifyWechatSign(params, key) {
  const { sign, ...rest } = params;
  const sorted = Object.keys(rest).sort();
  const str = sorted.map(k => `${k}=${rest[k]}`).join('&') + `&key=${key}`;
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase() === sign;
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
    console.error('预订场地失败:', error);
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

    if (booking.group_booking_id) {
      const remainingResult = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM bookings
         WHERE group_booking_id = $1 AND payment_status != 'cancelled'`,
        [booking.group_booking_id]
      );
      if (remainingResult.rows[0].cnt === 0) {
        await client.query(
          `UPDATE group_bookings SET status = 'cancelled' WHERE id = $1`,
          [booking.group_booking_id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      message: '取消预订成功',
      bookingId: id,
      waitlistPromoted: promoted ? { waitlistId: promoted.waitlistId, newBookingId: promoted.booking.id } : null,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('取消预订失败:', error);
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
    if (!courtNumber || !date || startHour === undefined || !memberPhone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '请提供完整信息: courtNumber, date, startHour, memberPhone' });
    }
    if (startHour < 8 || startHour > 21) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '候补时段仅限 8:00-21:00' });
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
      `SELECT id FROM bookings
       WHERE court_id = $1 AND booking_date = $2 AND start_hour = $3
       AND payment_status != 'cancelled' FOR UPDATE`,
      [courtId, date, startHour]
    );
    if (existingBooking.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '该时段有空闲场地，请直接预订' });
    }

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
    console.error('加入候补失败:', error);
    if (error.code === '40001') return res.status(409).json({ error: '操作冲突，请重试' });
    res.status(500).json({ error: '服务器内部错误' });
  } finally {
    client.release();
  }
});

app.get('/api/waitlist', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');

    const { date, courtNumber, memberPhone } = req.query;
    if (!date) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '请提供查询日期 (date 参数)' });
    }

    let query = `
      SELECT w.id, w.court_id, c.court_number, w.booking_date, w.start_hour,
             w.member_phone, w.status, w.notified_at, w.created_at,
             ROW_NUMBER() OVER (PARTITION BY w.court_id, w.booking_date, w.start_hour ORDER BY w.created_at) AS position
      FROM waitlist w
      JOIN courts c ON c.id = w.court_id
      WHERE w.booking_date = $1`;
    const params = [date];
    let paramIdx = 2;

    if (courtNumber) {
      query += ` AND c.court_number = $${paramIdx}`;
      params.push(courtNumber);
      paramIdx++;
    }
    if (memberPhone) {
      query += ` AND w.member_phone = $${paramIdx}`;
      params.push(memberPhone);
      paramIdx++;
    }

    query += ` ORDER BY w.court_id, w.start_hour, w.created_at`;

    const result = await client.query(query, params);
    await client.query('COMMIT');

    res.json({ date, waitlist: result.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('查询候补失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  } finally {
    client.release();
  }
});

app.delete('/api/waitlist/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const result = await client.query(
      `UPDATE waitlist SET status = 'cancelled' WHERE id = $1 AND status = 'waiting' RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '候补记录不存在或已处理' });
    }

    await client.query('COMMIT');
    res.json({ message: '已退出候补队列', waitlistId: id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('退出候补失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  } finally {
    client.release();
  }
});

app.post('/api/group-bookings', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    const { date, startHour, courtCount, memberPhone } = req.body;
    if (!date || startHour === undefined || !courtCount || !memberPhone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '请提供完整信息: date, startHour, courtCount, memberPhone' });
    }
    if (startHour < 8 || startHour > 21) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '预订时段仅限 8:00-21:00' });
    }
    if (courtCount < 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '团体预订至少需要 2 块场地' });
    }

    const courtsResult = await client.query(
      'SELECT id, court_number FROM courts WHERE is_active = true ORDER BY court_number FOR UPDATE'
    );

    const bookedResult = await client.query(
      `SELECT court_id FROM bookings
       WHERE booking_date = $1 AND start_hour = $2 AND payment_status != 'cancelled' FOR UPDATE`,
      [date, startHour]
    );
    const bookedCourtIds = new Set(bookedResult.rows.map(r => r.court_id));

    const availableCourts = courtsResult.rows.filter(c => !bookedCourtIds.has(c.id));
    if (availableCourts.length < courtCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `空闲场地不足，需要 ${courtCount} 块，当前仅 ${availableCourts.length} 块空闲`,
        availableCount: availableCourts.length,
      });
    }

    const selectedCourts = availableCourts.slice(0, courtCount);

    const groupResult = await client.query(
      `INSERT INTO group_bookings (member_phone, booking_date, start_hour, court_count, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, member_phone, booking_date, start_hour, court_count, status, created_at`,
      [memberPhone, date, startHour, courtCount]
    );
    const groupBooking = groupResult.rows[0];

    const bookingResults = [];
    for (const court of selectedCourts) {
      const br = await client.query(
        `INSERT INTO bookings (court_id, booking_date, start_hour, member_phone, payment_status, group_booking_id)
         VALUES ($1, $2, $3, $4, 'unpaid', $5)
         RETURNING id, court_id, booking_date, start_hour, member_phone, payment_status, group_booking_id, created_at`,
        [court.id, date, startHour, memberPhone, groupBooking.id]
      );
      bookingResults.push(br.rows[0]);
    }

    const outTradeNo = generateOutTradeNo();
    const totalFee = 5000 * courtCount;
    await client.query(
      `INSERT INTO payments (group_booking_id, out_trade_no, total_fee, status)
       VALUES ($1, $2, $3, 'pending')`,
      [groupBooking.id, outTradeNo, totalFee]
    );

    await client.query('COMMIT');

    res.status(201).json({
      groupBookingId: groupBooking.id,
      date: groupBooking.booking_date,
      startHour: groupBooking.start_hour,
      courtCount: groupBooking.court_count,
      memberPhone: groupBooking.member_phone,
      status: groupBooking.status,
      courts: selectedCourts.map(c => c.court_number),
      bookings: bookingResults.map(b => ({
        id: b.id,
        courtId: b.court_id,
        paymentStatus: b.payment_status,
      })),
      payment: { outTradeNo, totalFee },
      createdAt: groupBooking.created_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('团体预订失败:', error);
    if (error.code === '23505') return res.status(409).json({ error: '部分场地已被预订，请重试' });
    if (error.code === '40001') return res.status(409).json({ error: '预订冲突，请重试' });
    res.status(500).json({ error: '服务器内部错误' });
  } finally {
    client.release();
  }
});

app.get('/api/group-bookings/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');

    const { id } = req.params;
    const groupResult = await client.query(
      `SELECT id, member_phone, booking_date, start_hour, court_count, status, created_at
       FROM group_bookings WHERE id = $1`,
      [id]
    );
    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '团体预订不存在' });
    }

    const bookingsResult = await client.query(
      `SELECT b.id, b.court_id, c.court_number, b.payment_status, b.created_at
       FROM bookings b
       JOIN courts c ON c.id = b.court_id
       WHERE b.group_booking_id = $1
       ORDER BY c.court_number`,
      [id]
    );

    const paymentResult = await client.query(
      `SELECT out_trade_no, total_fee, status, paid_at FROM payments WHERE group_booking_id = $1`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      ...groupResult.rows[0],
      bookings: bookingsResult.rows,
      payment: paymentResult.rows[0] || null,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('查询团体预订失败:', error);
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

      if (totalFee !== undefined && parseInt(totalFee) !== payment.total_fee) {
        await client.query('ROLLBACK');
        return res.json({ return_code: 'FAIL', return_msg: '金额不一致' });
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

      if (payment.group_booking_id) {
        await client.query(
          `UPDATE bookings SET payment_status = 'paid' WHERE group_booking_id = $1`,
          [payment.group_booking_id]
        );
        const allPaidResult = await client.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid
           FROM bookings WHERE group_booking_id = $1`,
          [payment.group_booking_id]
        );
        if (allPaidResult.rows[0].total === allPaidResult.rows[0].paid) {
          await client.query(
            `UPDATE group_bookings SET status = 'confirmed' WHERE id = $1`,
            [payment.group_booking_id]
          );
        }
      }

      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }

    res.json({ return_code: 'SUCCESS', return_msg: 'OK' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('微信支付回调处理失败:', error);
    res.json({ return_code: 'FAIL', return_msg: '系统异常' });
  } finally {
    client.release();
  }
});

app.get('/api/payments/:outTradeNo', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');

    const { outTradeNo } = req.params;
    const result = await client.query(
      `SELECT p.out_trade_no, p.transaction_id, p.total_fee, p.status,
              p.pay_method, p.paid_at, p.created_at,
              b.court_id, b.booking_date, b.start_hour, b.payment_status AS booking_status,
              c.court_number,
              gb.court_count, gb.status AS group_status
       FROM payments p
       LEFT JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN courts c ON c.id = b.court_id
       LEFT JOIN group_bookings gb ON gb.id = p.group_booking_id
       WHERE p.out_trade_no = $1`,
      [outTradeNo]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '支付记录不存在' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('查询支付状态失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  } finally {
    client.release();
  }
});

setInterval(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');

    const timeoutResult = await client.query(
      `SELECT p.id AS payment_id, p.out_trade_no, p.booking_id, p.group_booking_id
       FROM payments p
       LEFT JOIN bookings b ON b.id = p.booking_id
       WHERE p.status = 'pending'
         AND p.created_at < NOW() - INTERVAL '${PAYMENT_TIMEOUT_MINUTES} minutes'`
    );

    for (const row of timeoutResult.rows) {
      await client.query(
        `UPDATE payments SET status = 'cancelled' WHERE id = $1`,
        [row.payment_id]
      );

      if (row.booking_id) {
        const bookingRow = await client.query(
          `SELECT court_id, booking_date, start_hour FROM bookings WHERE id = $1 FOR UPDATE`,
          [row.booking_id]
        );
        if (bookingRow.rows.length > 0 && bookingRow.rows[0].payment_status !== 'paid') {
          const b = bookingRow.rows[0];
          await client.query(
            `UPDATE bookings SET payment_status = 'cancelled' WHERE id = $1`,
            [row.booking_id]
          );
          await promoteWaitlist(client, b.court_id, b.booking_date, b.start_hour);
        }
      }

      if (row.group_booking_id) {
        const groupBookings = await client.query(
          `SELECT id, court_id, booking_date, start_hour FROM bookings
           WHERE group_booking_id = $1 AND payment_status != 'paid' FOR UPDATE`,
          [row.group_booking_id]
        );
        for (const gb of groupBookings.rows) {
          await client.query(
            `UPDATE bookings SET payment_status = 'cancelled' WHERE id = $1`,
            [gb.id]
          );
          await promoteWaitlist(client, gb.court_id, gb.booking_date, gb.start_hour);
        }
        await client.query(
          `UPDATE group_bookings SET status = 'cancelled' WHERE id = $1`,
          [row.group_booking_id]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('支付超时检查失败:', error);
  } finally {
    client.release();
  }
}, 60 * 1000);

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
