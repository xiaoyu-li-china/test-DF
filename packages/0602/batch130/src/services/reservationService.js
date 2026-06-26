const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const db = require('../db');
const lockService = require('./lockService');

const RESERVATION_STATUSES = {
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  CHARGING: 'charging',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

const ERROR_CODES = {
  SLOT_OCCUPIED: 'SLOT_OCCUPIED',
  STATION_OFFLINE: 'STATION_OFFLINE',
  SLOT_PAST: 'SLOT_PAST',
  DUPLICATE_RESERVATION: 'DUPLICATE_RESERVATION',
  LOCK_FAILED: 'LOCK_FAILED',
  RESERVATION_NOT_FOUND: 'RESERVATION_NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
};

class ReservationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReservationError';
    this.code = code;
    this.statusCode = code === ERROR_CODES.SLOT_OCCUPIED || 
                    code === ERROR_CODES.STATION_OFFLINE ? 409 : 422;
  }
}

async function validateStationOnline(stationId, client) {
  const result = await client.query(
    'SELECT status FROM stations WHERE id = $1',
    [stationId]
  );
  
  if (result.rows.length === 0) {
    throw new ReservationError('STATION_NOT_FOUND', '充电桩不存在');
  }
  
  const station = result.rows[0];
  if (station.status !== 'online') {
    throw new ReservationError(
      ERROR_CODES.STATION_OFFLINE,
      '充电桩当前离线，无法预约'
    );
  }
  
  return station;
}

async function validateSlotNotInPast(slotStart) {
  const now = dayjs();
  if (dayjs(slotStart).isBefore(now)) {
    throw new ReservationError(
      ERROR_CODES.SLOT_PAST,
      '不能预约过去的时间段'
    );
  }
}

async function validateNoDuplicateReservation(userId, stationId, slotStart, slotEnd, client) {
  const result = await client.query(
    `SELECT id FROM reservations 
     WHERE user_id = $1 
       AND station_id = $2 
       AND slot_start = $3 
       AND slot_end = $4 
       AND status IN ($5, $6, $7)
     LIMIT 1`,
    [userId, stationId, slotStart, slotEnd, 
     RESERVATION_STATUSES.PENDING_PAYMENT,
     RESERVATION_STATUSES.CONFIRMED,
     RESERVATION_STATUSES.CHARGING]
  );
  
  if (result.rows.length > 0) {
    throw new ReservationError(
      ERROR_CODES.DUPLICATE_RESERVATION,
      '您已有该时段的预约'
    );
  }
}

async function checkSlotAvailability(stationId, slotStart, slotEnd, client) {
  const result = await client.query(
    `SELECT id, status FROM reservations 
     WHERE station_id = $1 
       AND slot_start = $2 
       AND slot_end = $3 
       AND status IN ($4, $5, $6)
     LIMIT 1`,
    [stationId, slotStart, slotEnd,
     RESERVATION_STATUSES.PENDING_PAYMENT,
     RESERVATION_STATUSES.CONFIRMED,
     RESERVATION_STATUSES.CHARGING]
  );
  
  return result.rows.length === 0;
}

async function createReservation(userId, stationId, slotStart, slotEnd) {
  const slotStartDate = dayjs(slotStart).toDate();
  const slotEndDate = dayjs(slotEnd).toDate();

  let lock = null;
  try {
    lock = await lockService.acquireLock(stationId, slotStartDate, 15000);
    
    if (!lock) {
      throw new ReservationError(
        ERROR_CODES.LOCK_FAILED,
        '系统繁忙，请稍后重试'
      );
    }

    return await db.transaction(async (client) => {
      await validateStationOnline(stationId, client);
      await validateSlotNotInPast(slotStartDate);
      await validateNoDuplicateReservation(
        userId, stationId, slotStartDate, slotEndDate, client
      );

      const isAvailable = await checkSlotAvailability(
        stationId, slotStartDate, slotEndDate, client
      );
      
      if (!isAvailable) {
        throw new ReservationError(
          ERROR_CODES.SLOT_OCCUPIED,
          '该时段已被其他业主预约'
        );
      }

      const reservationId = `RES-${dayjs().format('YYYYMMDD')}-${uuidv4().slice(0, 4).toUpperCase()}`;
      const depositAmount = 2000;

      try {
        const result = await client.query(
          `INSERT INTO reservations 
           (id, station_id, user_id, slot_start, slot_end, status, deposit_amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [reservationId, stationId, userId, slotStartDate, slotEndDate,
           RESERVATION_STATUSES.PENDING_PAYMENT, depositAmount]
        );

        return {
          reservationId: result.rows[0].id,
          stationId: result.rows[0].station_id,
          slotStart: result.rows[0].slot_start,
          slotEnd: result.rows[0].slot_end,
          deposit: {
            amount: result.rows[0].deposit_amount,
            currency: 'CNY',
          },
          reservationStatus: result.rows[0].status,
          expiresAt: dayjs(result.rows[0].created_at).add(15, 'minute').toDate(),
        };
      } catch (dbErr) {
        if (dbErr.code === '23505' && dbErr.constraint_name === 'idx_active_reservation_slot') {
          throw new ReservationError(
            ERROR_CODES.SLOT_OCCUPIED,
            '该时段已被其他业主预约'
          );
        }
        throw dbErr;
      }
    });
  } finally {
    if (lock) {
      await lockService.releaseLock(lock);
    }
  }
}

async function confirmReservation(reservationId, userId) {
  return await db.transaction(async (client) => {
    const result = await client.query(
      `SELECT r.*, s.status as station_status
       FROM reservations r
       JOIN stations s ON r.station_id = s.id
       WHERE r.id = $1`,
      [reservationId]
    );

    if (result.rows.length === 0) {
      throw new ReservationError(
        ERROR_CODES.RESERVATION_NOT_FOUND,
        '预约不存在'
      );
    }

    const reservation = result.rows[0];

    if (reservation.user_id !== userId) {
      throw new ReservationError('NOT_OWNER', '无权操作此预约');
    }

    if (reservation.status !== RESERVATION_STATUSES.PENDING_PAYMENT) {
      throw new ReservationError(
        ERROR_CODES.INVALID_STATUS,
        '预约状态不正确'
      );
    }

    const updated = await client.query(
      `UPDATE reservations 
       SET status = $1, payment_status = 'paid', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [RESERVATION_STATUSES.CONFIRMED, reservationId]
    );

    return {
      reservationId: updated.rows[0].id,
      status: updated.rows[0].status,
      paymentStatus: 'paid',
    };
  });
}

async function cancelReservation(reservationId, userId) {
  const refundService = require('./refundService');
  
  return await db.transaction(async (client) => {
    const result = await client.query(
      `SELECT r.*, s.status as station_status
       FROM reservations r
       JOIN stations s ON r.station_id = s.id
       WHERE r.id = $1`,
      [reservationId]
    );

    if (result.rows.length === 0) {
      throw new ReservationError(
        ERROR_CODES.RESERVATION_NOT_FOUND,
        '预约不存在'
      );
    }

    const reservation = result.rows[0];

    if (reservation.user_id !== userId) {
      throw new ReservationError('NOT_OWNER', '无权操作此预约');
    }

    if (![RESERVATION_STATUSES.PENDING_PAYMENT, 
          RESERVATION_STATUSES.CONFIRMED].includes(reservation.status)) {
      throw new ReservationError(
        ERROR_CODES.INVALID_STATUS,
        '该状态下无法取消预约'
      );
    }

    const now = dayjs();
    const slotStart = dayjs(reservation.slot_start);
    const hoursBeforeStart = slotStart.diff(now, 'hour');

    let refundAmount = reservation.deposit_amount;
    let refundReason = 'reservation_cancel_full';

    if (hoursBeforeStart <= 2) {
      refundAmount = Math.floor(reservation.deposit_amount * 0.5);
      refundReason = 'reservation_cancel_half';
    }

    await client.query(
      `UPDATE reservations 
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [RESERVATION_STATUSES.CANCELLED, reservationId]
    );

    let refund = null;
    if (refundAmount > 0) {
      refund = await refundService.createRefund(
        reservationId,
        userId,
        refundAmount,
        refundReason,
        client
      );
    }

    return {
      reservationId,
      status: RESERVATION_STATUSES.CANCELLED,
      refund: refund ? {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      } : null,
    };
  });
}

async function getReservation(reservationId, userId) {
  const result = await db.query(
    `SELECT r.*, s.name as station_name, s.zone, s.floor
     FROM reservations r
     JOIN stations s ON r.station_id = s.id
     WHERE r.id = $1`,
    [reservationId]
  );

  if (result.rows.length === 0) {
    throw new ReservationError(
      ERROR_CODES.RESERVATION_NOT_FOUND,
      '预约不存在'
    );
  }

  const reservation = result.rows[0];

  if (reservation.user_id !== userId) {
    throw new ReservationError('NOT_OWNER', '无权查看此预约');
  }

  return {
    reservationId: reservation.id,
    stationId: reservation.station_id,
    stationName: reservation.station_name,
    location: {
      zone: reservation.zone, floor: reservation.floor },
    slotStart: reservation.slot_start,
    slotEnd: reservation.slot_end,
    status: reservation.status,
    deposit: {
      amount: reservation.deposit_amount,
      currency: 'CNY',
    },
    createdAt: reservation.created_at,
  };
}

module.exports = {
  createReservation,
  confirmReservation,
  cancelReservation,
  getReservation,
  RESERVATION_STATUSES,
  ERROR_CODES,
  ReservationError,
};
