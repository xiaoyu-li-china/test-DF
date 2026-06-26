const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const crypto = require('crypto');
const db = require('../db');
const priceService = require('./priceService');
const overtimeService = require('./overtimeService');
const refundService = require('./refundService');

class MeterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MeterError';
    this.code = code;
  }
}

function generateMeterSignature(stationId, meterValue, timestamp, secret) {
  const payload = `${stationId}:${meterValue}:${timestamp.toISOString()}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyMeterSignature(stationId, meterValue, timestamp, signature, secret) {
  const expectedSignature = generateMeterSignature(stationId, meterValue, timestamp, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

async function recordMeterReading(stationId, meterValue, readingType, 
  timestamp = null, source = 'iot', signature = null, sessionId = null) {
  
  const readingTimestamp = timestamp || new Date();
  const readingId = `MTR-${uuidv4().slice(0, 10).toUpperCase()}`;

  const expectedSignature = signature ? 
    generateMeterSignature(stationId, meterValue, readingTimestamp, process.env.METER_SECRET || 'default_secret') : 
    null;

  if (signature && expectedSignature && signature !== expectedSignature) {
    throw new MeterError('INVALID_SIGNATURE', '电表读数签名校验失败');
  }

  const result = await db.query(
    `INSERT INTO meter_readings 
     (id, station_id, session_id, reading_type, meter_value, reading_timestamp, source, signature)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [readingId, stationId, sessionId, readingType, 
     parseFloat(meterValue).toFixed(3), readingTimestamp, source, 
     signature || expectedSignature]
  );

  return result.rows[0];
}

async function getLatestMeterReading(stationId, readingType = null) {
  let query = `SELECT * FROM meter_readings WHERE station_id = $1`;
  const params = [stationId];

  if (readingType) {
    params.push(readingType);
    query += ` AND reading_type = $${params.length}`;
  }

  query += ` ORDER BY reading_timestamp DESC LIMIT 1`;

  const result = await db.query(query, params);
  
  if (result.rows.length === 0) {
    throw new MeterError('NO_READING', '未找到电表读数');
  }

  return result.rows[0];
}

async function getSessionMeterReadings(sessionId) {
  const result = await db.query(
    `SELECT * FROM meter_readings 
     WHERE session_id = $1 
     ORDER BY reading_timestamp`,
    [sessionId]
  );

  return result.rows;
}

async function simulateMeterReading(stationId, sessionId, durationMinutes, powerKw) {
  const energyKwh = (powerKw * durationMinutes) / 60;
  
  const prevReading = await getLatestMeterReading(stationId).catch(() => null);
  const startValue = prevReading ? parseFloat(prevReading.meter_value) : 1000.000;
  const endValue = startValue + energyKwh;

  const startTime = dayjs();
  const endTime = startTime.add(durationMinutes, 'minute');

  const startReading = await recordMeterReading(
    stationId, startValue, 'session_start',
    startTime.toDate(), 'simulation', null, sessionId
  );

  for (let i = 1; i < durationMinutes; i += 5) {
    const interimValue = startValue + (energyKwh * i / durationMinutes);
    await recordMeterReading(
      stationId, interimValue.toFixed(3), 'interim',
      startTime.add(i, 'minute').toDate(), 'simulation', null, sessionId
    );
  }

  const endReading = await recordMeterReading(
    stationId, endValue.toFixed(3), 'session_end',
    endTime.toDate(), 'simulation', null, sessionId
  );

  return {
    energyKwh: Math.round(energyKwh * 100) / 100,
    startReading,
    endReading,
    durationMinutes,
  };
}

async function calculateEnergyUsage(sessionId) {
  const readings = await getSessionMeterReadings(sessionId);
  
  if (readings.length < 2) {
    throw new MeterError('INSUFFICIENT_READINGS', '电表读数不足，无法计算用电量');
  }

  const startReading = readings.find(r => r.reading_type === 'session_start') || readings[0];
  const endReading = readings.find(r => r.reading_type === 'session_end') || readings[readings.length - 1];

  const energyKwh = parseFloat(endReading.meter_value) - parseFloat(startReading.meter_value);

  if (energyKwh < 0) {
    throw new MeterError('NEGATIVE_USAGE', '用电量计算异常，出现负数');
  }

  return {
    energyKwh: Math.round(energyKwh * 100) / 100,
    startReadingId: startReading.id,
    endReadingId: endReading.id,
    startTime: startReading.reading_timestamp,
    endTime: endReading.reading_timestamp,
    readingCount: readings.length,
  };
}

async function startChargingSession(stationId, reservationId, userId) {
  return db.transaction(async (client) => {
    const reservationResult = await client.query(
      `SELECT * FROM reservations WHERE id = $1 FOR UPDATE`,
      [reservationId]
    );

    if (reservationResult.rows.length === 0) {
      throw new MeterError('RESERVATION_NOT_FOUND', '预约不存在');
    }

    const reservation = reservationResult.rows[0];

    if (reservation.status !== 'confirmed') {
      throw new MeterError('INVALID_RESERVATION_STATUS', '预约状态不正确');
    }

    if (reservation.user_id !== userId) {
      throw new MeterError('NOT_OWNER', '无权操作此预约');
    }

    const now = new Date();
    const sessionId = `SES-${dayjs().format('YYYYMMDD')}-${uuidv4().slice(0, 6).toUpperCase()}`;

    await client.query(
      `INSERT INTO charging_sessions 
       (id, reservation_id, station_id, user_id, started_at, status)
       VALUES ($1, $2, $3, $4, $5, 'charging')`,
      [sessionId, reservationId, stationId, userId, now]
    );

    await client.query(
      `UPDATE reservations SET status = 'charging' WHERE id = $1`,
      [reservationId]
    );

    await client.query(
      `UPDATE stations SET status = 'in_use' WHERE id = $1`,
      [stationId]
    );

    const prevReading = await client.query(
      `SELECT * FROM meter_readings WHERE station_id = $1 ORDER BY reading_timestamp DESC LIMIT 1`,
      [stationId]
    );

    const startMeterValue = prevReading.rows.length > 0 
      ? prevReading.rows[0].meter_value 
      : 1000.000;

    const meterId = `MTR-${uuidv4().slice(0, 10).toUpperCase()}`;
    await client.query(
      `INSERT INTO meter_readings 
       (id, station_id, session_id, reading_type, meter_value, reading_timestamp, source)
       VALUES ($1, $2, $3, 'session_start', $4, $5, 'iot')`,
      [meterId, stationId, sessionId, startMeterValue, now]
    );

    return {
      sessionId,
      stationId,
      reservationId,
      startedAt: now,
      status: 'charging',
      startMeterValue: parseFloat(startMeterValue),
    };
  });
}

async function stopChargingSession(sessionId, userId) {
  return db.transaction(async (client) => {
    const sessionResult = await client.query(
      `SELECT cs.*, r.deposit_amount 
       FROM charging_sessions cs
       JOIN reservations r ON cs.reservation_id = r.id
       WHERE cs.id = $1 FOR UPDATE`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new MeterError('SESSION_NOT_FOUND', '充电会话不存在');
    }

    const session = sessionResult.rows[0];

    if (session.user_id !== userId) {
      throw new MeterError('NOT_OWNER', '无权操作此会话');
    }

    if (session.status !== 'charging') {
      throw new MeterError('INVALID_SESSION_STATUS', '会话状态不正确');
    }

    const now = new Date();

    const prevReading = await client.query(
      `SELECT * FROM meter_readings WHERE station_id = $1 ORDER BY reading_timestamp DESC LIMIT 1`,
      [session.station_id]
    );

    const randomUsage = 10 + Math.random() * 30;
    const endMeterValue = parseFloat(prevReading.rows[0].meter_value) + randomUsage;

    const meterId = `MTR-${uuidv4().slice(0, 10).toUpperCase()}`;
    await client.query(
      `INSERT INTO meter_readings 
       (id, station_id, session_id, reading_type, meter_value, reading_timestamp, source)
       VALUES ($1, $2, $3, 'session_end', $4, $5, 'iot')
       RETURNING *`,
      [meterId, session.station_id, sessionId, endMeterValue.toFixed(3), now]
    );

    const endReading = (await client.query(
      `SELECT * FROM meter_readings WHERE id = $1`,
      [meterId]
    )).rows[0];

    const startReadingResult = await client.query(
      `SELECT * FROM meter_readings 
       WHERE session_id = $1 AND reading_type = 'session_start'
       LIMIT 1`,
      [sessionId]
    );

    const startReading = startReadingResult.rows[0];
    const energyKwh = Math.round((parseFloat(endReading.meter_value) - 
                                 parseFloat(startReading.meter_value)) * 100) / 100;

    const energyCost = await priceService.calculateEnergyCost(
      session.station_id,
      energyKwh,
      session.started_at,
      now
    );

    const overtimeCalc = await overtimeService.calculateOvertimeFee(sessionId, now);

    const totalCost = energyCost.totalCost + overtimeCalc.overtimeFee;
    const depositDeducted = overtimeCalc.depositDeduction;
    const remainingDeposit = Math.max(0, session.deposit_amount - depositDeducted);
    
    const depositUsed = Math.min(remainingDeposit, totalCost);
    const additionalCharge = Math.max(0, totalCost - depositUsed);
    const depositRefunded = Math.max(0, remainingDeposit - depositUsed);

    const settlementId = `SET-${dayjs().format('YYYYMMDD')}-${uuidv4().slice(0, 6).toUpperCase()}`;

    await client.query(
      `INSERT INTO settlements 
       (id, reservation_id, session_id, user_id, station_id,
        energy_kwh, base_cost_cents, peak_surcharge_cents, overtime_fee_cents,
        deposit_deducted_cents, deposit_refunded_cents, total_amount_cents,
        payment_status, price_config_id, start_meter_id, end_meter_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        settlementId,
        session.reservation_id,
        sessionId,
        session.user_id,
        session.station_id,
        energyKwh,
        energyCost.baseCost,
        energyCost.peakSurcharge,
        overtimeCalc.overtimeFee,
        depositDeducted,
        depositRefunded,
        totalCost,
        additionalCharge > 0 ? 'pending' : 'paid',
        energyCost.configId,
        startReading.id,
        endReading.id,
      ]
    );

    await client.query(
      `UPDATE charging_sessions 
       SET status = 'completed',
           stopped_at = $1,
           energy_kwh = $2,
           cost_cents = $3,
           overtime_fee_cents = $4,
           deposit_deducted_cents = $5
       WHERE id = $6`,
      [now, energyKwh, energyCost.totalCost, 
       overtimeCalc.overtimeFee, depositDeducted, sessionId]
    );

    await client.query(
      `UPDATE reservations SET status = 'completed' WHERE id = $1`,
      [session.reservation_id]
    );

    await client.query(
      `UPDATE stations SET status = 'online' WHERE id = $1`,
      [session.station_id]
    );

    if (depositRefunded > 0) {
      await refundService.createRefund(
        session.reservation_id,
        session.user_id,
        depositRefunded,
        'deposit_refund',
        client
      );
    }

    await overtimeService.sendAlert(
      sessionId,
      'CHARGING_COMPLETED',
      `充电已完成。用电量：${energyKwh}度，电费：${(totalCost / 100).toFixed(2)}元，${depositRefunded > 0 ? `押金退还：${(depositRefunded / 100).toFixed(2)}元` : '无押金退还'}`,
      session.user_id
    );

    return {
      settlementId,
      sessionId,
      energyKwh,
      costBreakdown: {
        baseCost: energyCost.baseCost,
        peakSurcharge: energyCost.peakSurcharge,
        overtimeFee: overtimeCalc.overtimeFee,
        depositDeducted,
        totalCost,
      },
      payment: {
        depositUsed,
        additionalCharge,
        depositRefunded,
        status: additionalCharge > 0 ? 'pending_payment' : 'completed',
      },
      pricing: {
        baseRate: energyCost.baseRate,
        peakRate: energyCost.peakRate,
        peakHours: energyCost.peakHours,
        baseHours: energyCost.baseHours,
        configId: energyCost.configId,
      },
      meter: {
        startValue: parseFloat(startReading.meter_value),
        endValue: parseFloat(endReading.meter_value),
        startTime: session.started_at,
        endTime: now,
      },
      overtime: {
        minutes: overtimeCalc.overtimeMinutes,
        feePerMinute: overtimeCalc.overtimeFeeCentsPerMinute,
      },
    };
  });
}

async function getSettlement(settlementId, userId) {
  const result = await db.query(
    `SELECT s.*, 
            start.meter_value as start_meter_value,
            end.meter_value as end_meter_value,
            st.name as station_name
     FROM settlements s
     LEFT JOIN meter_readings start ON s.start_meter_id = start.id
     LEFT JOIN meter_readings end ON s.end_meter_id = end.id
     LEFT JOIN stations st ON s.station_id = st.id
     WHERE s.id = $1`,
    [settlementId]
  );

  if (result.rows.length === 0) {
    throw new MeterError('SETTLEMENT_NOT_FOUND', '结算记录不存在');
  }

  const s = result.rows[0];

  if (s.user_id !== userId) {
    throw new MeterError('NOT_OWNER', '无权查看此结算记录');
  }

  return {
    settlementId: s.id,
    reservationId: s.reservation_id,
    sessionId: s.session_id,
    station: {
      id: s.station_id,
      name: s.station_name,
    },
    energyKwh: parseFloat(s.energy_kwh),
    costBreakdown: {
      baseCost: s.base_cost_cents,
      peakSurcharge: s.peak_surcharge_cents,
      overtimeFee: s.overtime_fee_cents,
      depositDeducted: s.deposit_deducted_cents,
      depositRefunded: s.deposit_refunded_cents,
      totalAmount: s.total_amount_cents,
    },
    paymentStatus: s.payment_status,
    pricing: {
      configId: s.price_config_id,
    },
    meter: {
      startValue: s.start_meter_value ? parseFloat(s.start_meter_value) : null,
      endValue: s.end_meter_value ? parseFloat(s.end_meter_value) : null,
    },
    createdAt: s.created_at,
  };
}

async function getSettlementHistory(userId, limit = 50, offset = 0) {
  const result = await db.query(
    `SELECT s.*, st.name as station_name
     FROM settlements s
     LEFT JOIN stations st ON s.station_id = st.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows.map(s => ({
    settlementId: s.id,
    sessionId: s.session_id,
    station: {
      id: s.station_id,
      name: s.station_name,
    },
    energyKwh: parseFloat(s.energy_kwh),
    totalAmount: s.total_amount_cents,
    paymentStatus: s.payment_status,
    createdAt: s.created_at,
  }));
}

module.exports = {
  recordMeterReading,
  getLatestMeterReading,
  getSessionMeterReadings,
  simulateMeterReading,
  calculateEnergyUsage,
  startChargingSession,
  stopChargingSession,
  getSettlement,
  getSettlementHistory,
  generateMeterSignature,
  verifyMeterSignature,
  MeterError,
};
