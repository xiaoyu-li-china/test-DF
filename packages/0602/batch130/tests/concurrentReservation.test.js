const dayjs = require('dayjs');
const db = require('../src/db');
const reservationService = require('../src/services/reservationService');

async function clearTestData() {
  await db.query('DELETE FROM reservations');
  await db.query('DELETE FROM refunds');
}

describe('Concurrent Reservation Test', () => {
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

  test('同一桩同一时段两个用户并发预约，只有一个成功', async () => {
    const stationId = 'ST-001';
    const slotStart = dayjs().add(2, 'day').hour(10).minute(0).second(0);
    const slotEnd = slotStart.add(2, 'hour');

    const promises = [
      reservationService.createReservation(
        'USER-001',
        stationId,
        slotStart.toDate(),
        slotEnd.toDate()
      ).catch(err => err),
      reservationService.createReservation(
        'USER-002',
        stationId,
        slotStart.toDate(),
        slotEnd.toDate()
      ).catch(err => err),
    ];

    const results = await Promise.all(promises);

    const successful = results.filter(r => !(r instanceof Error));
    const failed = results.filter(r => r instanceof Error);

    console.log('Successful:', successful.length);
    console.log('Failed:', failed.length);

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(1);

    const reservationResult = await db.query(
      `SELECT COUNT(*) as count FROM reservations 
       WHERE station_id = $1 
         AND slot_start = $2 
         AND slot_end = $3
         AND status IN ('pending_payment', 'confirmed', 'charging')`,
      [stationId, slotStart.toDate(), slotEnd.toDate()]
    );

    expect(parseInt(reservationResult.rows[0].count)).toBe(1);
  }, 15000);

  test('同一桩同一时段五个用户并发预约，只有一个成功', async () => {
    const stationId = 'ST-002';
    const slotStart = dayjs().add(3, 'day').hour(14).minute(0).second(0);
    const slotEnd = slotStart.add(2, 'hour');

    const userIds = ['USER-001', 'USER-002', 'USER-003', 'USER-004', 'USER-005'];

    const promises = userIds.map(userId =>
      reservationService.createReservation(
        userId,
        stationId,
        slotStart.toDate(),
        slotEnd.toDate()
      ).catch(err => err)
    );

    const results = await Promise.all(promises);

    const successful = results.filter(r => !(r instanceof Error));
    const failed = results.filter(r => r instanceof Error);

    console.log('Successful:', successful.length);
    console.log('Failed:', failed.length);

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(4);

    const reservationResult = await db.query(
      `SELECT user_id FROM reservations 
       WHERE station_id = $1 
         AND slot_start = $2 
         AND slot_end = $3
         AND status IN ('pending_payment', 'confirmed', 'charging')`,
      [stationId, slotStart.toDate(), slotEnd.toDate()]
    );

    expect(reservationResult.rows.length).toBe(1);
  }, 30000);

  test('同一用户不能重复预约同一时段', async () => {
    const stationId = 'ST-003';
    const slotStart = dayjs().add(4, 'day').hour(8).minute(0).second(0);
    const slotEnd = slotStart.add(2, 'hour');

    const result1 = await reservationService.createReservation(
      'USER-001',
      stationId,
      slotStart.toDate(),
      slotEnd.toDate()
    );

    expect(result1).toHaveProperty('reservationId');

    const result2 = await reservationService.createReservation(
      'USER-001',
      stationId,
      slotStart.toDate(),
      slotEnd.toDate()
    ).catch(err => err);

    expect(result2).toBeInstanceOf(Error);
    expect(result2.code).toBe('DUPLICATE_RESERVATION');
  }, 10000);

  test('离线的桩不能预约', async () => {
    const stationId = 'ST-012';
    const slotStart = dayjs().add(2, 'day').hour(10).minute(0).second(0);
    const slotEnd = slotStart.add(2, 'hour');

    const result = await reservationService.createReservation(
      'USER-001',
      stationId,
      slotStart.toDate(),
      slotEnd.toDate()
    ).catch(err => err);

    expect(result).toBeInstanceOf(Error);
    expect(result.code).toBe('STATION_OFFLINE');
  }, 10000);

  test('不能预约过去的时段', async () => {
    const stationId = 'ST-001';
    const slotStart = dayjs().subtract(1, 'day').hour(10).minute(0).second(0);
    const slotEnd = slotStart.add(2, 'hour');

    const result = await reservationService.createReservation(
      'USER-001',
      stationId,
      slotStart.toDate(),
      slotEnd.toDate()
    ).catch(err => err);

    expect(result).toBeInstanceOf(Error);
    expect(result.code).toBe('SLOT_PAST');
  }, 10000);
});
