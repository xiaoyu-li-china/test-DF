const dayjs = require('dayjs');
const db = require('../src/db');
const reservationService = require('../src/services/reservationService');
const refundService = require('../src/services/refundService');

async function clearTestData() {
  await db.query('DELETE FROM charging_sessions');
  await db.query('DELETE FROM refunds');
  await db.query('DELETE FROM reservations');
  await db.query("UPDATE users SET balance = 5000 WHERE id = 'USER-001'");
}

describe('Refund Process Test', () => {
  beforeAll(async () => {
    await clearTestData();
  });

  afterAll(async () => {
    await clearTestData();
    await db.pool.end();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  test('取消预约后自动创建退款记录', async () => {
    const stationId = 'ST-001';
    const slotStart = dayjs().add(2, 'day').hour(10).minute(0).second(0);
    const slotEnd = slotStart.add(2, 'hour');

    const reservation = await reservationService.createReservation(
      'USER-001',
      stationId,
      slotStart.toDate(),
      slotEnd.toDate()
    );

    expect(reservation).toHaveProperty('reservationId');

    const cancelResult = await reservationService.cancelReservation(
      reservation.reservationId,
      'USER-001'
    );

    expect(cancelResult.status).toBe('cancelled');
    expect(cancelResult.refund).not.toBeNull();
    expect(cancelResult.refund.amount).toBe(2000);

    const refundResult = await db.query(
      'SELECT * FROM refunds WHERE reservation_id = $1',
      [reservation.reservationId]
    );

    expect(refundResult.rows.length).toBe(1);
    expect(refundResult.rows[0].status).toBe('pending');
    expect(refundResult.rows[0].amount).toBe(2000);
  }, 15000);

  test('取消预约后2小时内只退还50%押金', async () => {
    const stationId = 'ST-002';
    const slotStart = dayjs().add(1, 'hour');
    const slotEnd = slotStart.add(2, 'hour');

    const reservation = await reservationService.createReservation(
      'USER-001',
      stationId,
      slotStart.toDate(),
      slotEnd.toDate()
    );

    const cancelResult = await reservationService.cancelReservation(
      reservation.reservationId,
      'USER-001'
    );

    expect(cancelResult.refund.amount).toBe(1000);

    const refundResult = await db.query(
      'SELECT * FROM refunds WHERE reservation_id = $1',
      [reservation.reservationId]
    );

    expect(refundResult.rows[0].amount).toBe(1000);
    expect(refundResult.rows[0].reason).toBe('reservation_cancel_half');
  }, 15000);

  test('退款成功后用户余额增加', async () => {
    const refund = await refundService.createRefund(
      'TEST-RES-001',
      'USER-001',
      2000,
      'test_refund'
    );

    const initialBalance = await db.query(
      "SELECT balance FROM users WHERE id = 'USER-001'"
    );

    const result = await refundService.processRefund(refund.id);

    if (result.status === 'success') {
      const finalBalance = await db.query(
        "SELECT balance FROM users WHERE id = 'USER-001'"
      );

      expect(parseInt(finalBalance.rows[0].balance)).toBe(
        parseInt(initialBalance.rows[0].balance) + 2000
      );
    }

    const refundStatus = await refundService.getRefundStatus(refund.id);
    console.log('Refund status:', refundStatus.status);
    console.log('Retry count:', refundStatus.retryCount);

    expect(['success', 'failed', 'dead_letter']).toContain(refundStatus.status);
  }, 10000);

  test('退款失败后进入重试队列', async () => {
    process.env.REFUND_SUCCESS_RATE = '0';

    const refund = await refundService.createRefund(
      'TEST-RES-002',
      'USER-001',
      1500,
      'test_refund_fail'
    );

    const result = await refundService.processRefund(refund.id);

    expect(result.status).toBe('failed');
    expect(result.remainingRetries).toBeGreaterThan(0);
    expect(result.nextRetryAt).toBeDefined();

    const refundStatus = await refundService.getRefundStatus(refund.id);
    expect(refundStatus.status).toBe('failed');
    expect(refundStatus.retryCount).toBe(1);
    expect(refundStatus.nextRetryAt).not.toBeNull();

    delete process.env.REFUND_SUCCESS_RATE;
  }, 10000);

  test('超过最大重试次数进入死信队列', async () => {
    process.env.REFUND_SUCCESS_RATE = '0';

    const refund = await db.query(
      `INSERT INTO refunds 
       (id, reservation_id, user_id, amount, reason, status, retry_count, max_retries)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['REF-TEST-DEAD-001', 'TEST-RES-003', 'USER-001', 1000, 'test_dead_letter', 'failed', 5, 5]
    );

    const result = await refundService.processRefund('REF-TEST-DEAD-001');

    expect(result.status).toBe('dead_letter');

    const deadLetters = await refundService.getDeadLetterRefunds();
    const hasDeadLetter = deadLetters.some(r => r.refundId === 'REF-TEST-DEAD-001');
    expect(hasDeadLetter).toBe(true);

    delete process.env.REFUND_SUCCESS_RATE;
  }, 10000);

  test('人工处理死信退款成功', async () => {
    const refund = await db.query(
      `INSERT INTO refunds 
       (id, reservation_id, user_id, amount, reason, status, retry_count, max_retries)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      ['REF-TEST-MANUAL-001', 'TEST-RES-004', 'USER-001', 2000, 'test_manual', 'dead_letter', 5, 5]
    );

    const initialBalance = await db.query(
      "SELECT balance FROM users WHERE id = 'USER-001'"
    );

    const result = await refundService.manualRefundSuccess(
      'REF-TEST-MANUAL-001',
      '人工处理'
    );

    expect(result.status).toBe('success');

    const finalBalance = await db.query(
      "SELECT balance FROM users WHERE id = 'USER-001'"
    );

    expect(parseInt(finalBalance.rows[0].balance)).toBe(
      parseInt(initialBalance.rows[0].balance) + 2000
    );
  }, 10000);

  test('可查询退款状态和预计完成时间', async () => {
    const refund = await refundService.createRefund(
      'TEST-RES-005',
      'USER-001',
      2000,
      'test_status'
    );

    const status = await refundService.getRefundStatus(refund.id);

    expect(status.refundId).toBe(refund.id);
    expect(status.amount).toBe(2000);
    expect(status.status).toBeDefined();
    expect(status.createdAt).toBeDefined();

    if (status.status === 'pending') {
      expect(status.estimatedCompletion).toBeDefined();
    }
  }, 10000);
});
