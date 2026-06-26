const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const db = require('../db');
const { v4: uuid } = require('uuid');

class OvertimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OvertimeError';
    this.code = code;
  }
}

async function getOvertimeRule(stationId) {
  const result = await db.query(
    `SELECT * FROM overtime_rules 
     WHERE (station_id = $1 OR station_id IS NULL)
     ORDER BY 
       CASE WHEN station_id IS NOT NULL THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`,
    [stationId]
  );

  if (result.rows.length === 0) {
    return {
      id: 'OT-DEFAULT',
      station_id: null,
      grace_period_minutes: 30,
      overtime_fee_cents_per_minute: 10,
      max_overtime_hours: 2,
      deposit_deduction_percent: 50,
      auto_release_enabled: true,
    };
  }

  return result.rows[0];
}

async function createOvertimeRule(ruleData, adminId) {
  const {
    stationId,
    gracePeriodMinutes = 30,
    overtimeFeeCentsPerMinute,
    maxOvertimeHours = 2,
    depositDeductionPercent = 50,
    autoReleaseEnabled = true,
    isDefault = false,
  } = ruleData;

  if (gracePeriodMinutes < 0) {
    throw new OvertimeError('INVALID_GRACE_PERIOD', '宽限时间不能为负');
  }
  if (overtimeFeeCentsPerMinute <= 0) {
    throw new OvertimeError('INVALID_OVERTIME_FEE', '超时费率必须大于0');
  }
  if (depositDeductionPercent < 0 || depositDeductionPercent > 100) {
    throw new OvertimeError('INVALID_DEDUCTION', '押金扣除比例必须在0-100之间');
  }

  const ruleId = `OT-${uuidv4().slice(0, 6).toUpperCase()}`;

  return db.transaction(async (client) => {
    if (isDefault || !stationId) {
      await client.query(
        `UPDATE overtime_rules SET is_default = false WHERE is_default = true AND station_id IS NULL`
      );
    }

    const result = await client.query(
      `INSERT INTO overtime_rules 
       (id, station_id, grace_period_minutes, overtime_fee_cents_per_minute,
        max_overtime_hours, deposit_deduction_percent, auto_release_enabled, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        ruleId,
        stationId || null,
        gracePeriodMinutes,
        overtimeFeeCentsPerMinute,
        maxOvertimeHours,
        depositDeductionPercent,
        autoReleaseEnabled,
        isDefault || !stationId,
      ]
    );

    return result.rows[0];
  });
}

async function checkSessionOvertime(sessionId) {
  const sessionResult = await db.query(
    `SELECT cs.*, r.slot_end, r.deposit_amount 
     FROM charging_sessions cs
     JOIN reservations r ON cs.reservation_id = r.id
     WHERE cs.id = $1`,
    [sessionId]
  );

  if (sessionResult.rows.length === 0) {
    throw new OvertimeError('SESSION_NOT_FOUND', '充电会话不存在');
  }

  const session = sessionResult.rows[0];
  
  if (session.status !== 'charging') {
    return { isOvertime: false, overtimeMinutes: 0 };
  }

  const rule = await getOvertimeRule(session.station_id);
  const slotEnd = dayjs(session.slot_end);
  const now = dayjs();
  const graceEnd = slotEnd.add(rule.grace_period_minutes, 'minute');
  
  const isOvertime = now.isAfter(graceEnd);
  const overtimeMinutes = isOvertime ? Math.max(0, now.diff(graceEnd, 'minute')) : 0;

  return {
    isOvertime,
    overtimeMinutes,
    gracePeriodMinutes: rule.grace_period_minutes,
    maxOvertimeHours: rule.max_overtime_hours,
    overtimeFeeCentsPerMinute: rule.overtime_fee_cents_per_minute,
    depositDeductionPercent: rule.deposit_deduction_percent,
    autoReleaseEnabled: rule.auto_release_enabled,
    slotEnd: session.slot_end,
    graceEnd: graceEnd.toDate(),
    shouldRelease: isOvertime && 
      rule.auto_release_enabled && 
      (overtimeMinutes >= rule.max_overtime_hours * 60),
    estimatedOvertimeFee: Math.min(
      overtimeMinutes * rule.overtime_fee_cents_per_minute,
      rule.max_overtime_hours * 60 * rule.overtime_fee_cents_per_minute
    ),
  };
}

async function calculateOvertimeFee(sessionId, endTime) {
  const sessionResult = await db.query(
    `SELECT cs.*, r.slot_end, r.deposit_amount 
     FROM charging_sessions cs
     JOIN reservations r ON cs.reservation_id = r.id
     WHERE cs.id = $1`,
    [sessionId]
  );

  if (sessionResult.rows.length === 0) {
    throw new OvertimeError('SESSION_NOT_FOUND', '充电会话不存在');
  }

  const session = sessionResult.rows[0];
  const rule = await getOvertimeRule(session.station_id);
  
  const slotEnd = dayjs(session.slot_end);
  const actualEnd = dayjs(endTime);
  const graceEnd = slotEnd.add(rule.grace_period_minutes, 'minute');

  if (actualEnd.isBefore(graceEnd)) {
    return {
      overtimeFee: 0,
      overtimeMinutes: 0,
      depositDeduction: 0,
      gracePeriodMinutes: rule.grace_period_minutes,
    };
  }

  let overtimeMinutes = actualEnd.diff(graceEnd, 'minute');
  const maxOvertimeMinutes = rule.max_overtime_hours * 60;
  
  overtimeMinutes = Math.min(overtimeMinutes, maxOvertimeMinutes);
  
  const overtimeFee = overtimeMinutes * rule.overtime_fee_cents_per_minute;
  const depositDeduction = Math.floor(session.deposit_amount * rule.deposit_deduction_percent / 100);

  return {
    overtimeFee,
    overtimeMinutes,
    depositDeduction,
    gracePeriodMinutes: rule.grace_period_minutes,
    maxOvertimeMinutes,
    overtimeFeeCentsPerMinute: rule.overtime_fee_cents_per_minute,
    depositDeductionPercent: rule.deposit_deduction_percent,
  };
}

async function sendAlert(sessionId, alertType, message, recipientId) {
  const alertId = `ALERT-${uuidv4().slice(0, 8).toUpperCase()}`;
  
  await db.query(
    `INSERT INTO session_alerts 
     (id, session_id, alert_type, message, sent_at, recipient_id)
     VALUES ($1, $2, $3, $4, NOW(), $5)`,
    [alertId, sessionId, alertType, message, recipientId]
  );

  console.log(`ALERT [${alertType}] Session ${sessionId}: ${message}`);
  return { alertId, alertType, message, recipientId, sentAt: new Date() };
}

async function processOvertimeSession(sessionId) {
  const overtimeStatus = await checkSessionOvertime(sessionId);
  
  if (!overtimeStatus.isOvertime) {
    return { action: 'none', reason: 'not_overtime' };
  }

  const sessionResult = await db.query(
    `SELECT cs.*, r.user_id, r.deposit_amount
     FROM charging_sessions cs
     JOIN reservations r ON cs.reservation_id = r.id
     WHERE cs.id = $1`,
    [sessionId]
  );
  
  const session = sessionResult.rows[0];
  
  if (overtimeStatus.overtimeMinutes === 1) {
    await sendAlert(
      sessionId,
      'OVERTIME_START',
      `您已超过预约结束时间，将按每分钟${overtimeStatus.overtimeFeeCentsPerMinute / 100}元收取超时费`,
      session.user_id
    );
  }

  const tenMinutesBeforeMax = (overtimeStatus.maxOvertimeHours * 60) - 10;
  if (overtimeStatus.overtimeMinutes === tenMinutesBeforeMax && overtimeStatus.autoReleaseEnabled) {
    await sendAlert(
      sessionId,
      'OVERTIME_WARNING',
      `您已超时${overtimeStatus.overtimeMinutes}分钟，还剩10分钟将自动断电并扣除押金`,
      session.user_id
    );
  }

  if (overtimeStatus.shouldRelease) {
    return await forceStopCharging(sessionId, 'overtime_auto_release');
  }

  return {
    action: 'monitored',
    overtimeMinutes: overtimeStatus.overtimeMinutes,
    estimatedFee: overtimeStatus.estimatedOvertimeFee,
  };
}

async function forceStopCharging(sessionId, reason = 'manual') {
  return db.transaction(async (client) => {
    const sessionResult = await client.query(
      `SELECT cs.*, r.user_id, r.deposit_amount, r.slot_end
       FROM charging_sessions cs
       JOIN reservations r ON cs.reservation_id = r.id
       WHERE cs.id = $1 FOR UPDATE`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new OvertimeError('SESSION_NOT_FOUND', '充电会话不存在');
    }

    const session = sessionResult.rows[0];
    
    if (session.status !== 'charging') {
      return { action: 'already_stopped', sessionId };
    }

    const overtimeCalc = await calculateOvertimeFee(sessionId, new Date());
    
    const stopResult = await client.query(
      `UPDATE charging_sessions 
       SET status = 'completed',
           stopped_at = NOW(),
           overtime_fee_cents = $1,
           deposit_deducted_cents = $2
       WHERE id = $3
       RETURNING *`,
      [overtimeCalc.overtimeFee, overtimeCalc.depositDeduction, sessionId]
    );

    await client.query(
      `UPDATE reservations 
       SET status = 'completed'
       WHERE id = $1`,
      [session.reservation_id]
    );

    await client.query(
      `UPDATE stations 
       SET status = 'online'
       WHERE id = $1`,
      [session.station_id]
    );

    let alertMessage;
    if (reason === 'overtime_auto_release') {
      alertMessage = `因超时${overtimeCalc.overtimeMinutes}分钟，已自动断电。扣除押金${overtimeCalc.depositDeduction / 100}元，超时费${overtimeCalc.overtimeFee / 100}元`;
    } else {
      alertMessage = `充电已结束，超时${overtimeCalc.overtimeMinutes}分钟，超时费${overtimeCalc.overtimeFee / 100}元`;
    }

    await sendAlert(sessionId, 'CHARGING_STOPPED', alertMessage, session.user_id);

    return {
      action: 'stopped',
      sessionId,
      reason,
      overtimeFee: overtimeCalc.overtimeFee,
      depositDeduction: overtimeCalc.depositDeduction,
      overtimeMinutes: overtimeCalc.overtimeMinutes,
    };
  });
}

let monitorInterval;

async function monitorOvertimeSessions() {
  const result = await db.query(
    `SELECT cs.id 
     FROM charging_sessions cs
     WHERE cs.status = 'charging'`
  );

  const actions = [];
  
  for (const row of result.rows) {
    try {
      const action = await processOvertimeSession(row.id);
      actions.push({ sessionId: row.id, ...action });
    } catch (err) {
      console.error(`Error processing overtime for session ${row.id}`, err);
    }
  }

  return actions;
}

function startOvertimeMonitor(intervalMs = 60 * 1000) {
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }

  monitorInterval = setInterval(async () => {
    try {
      await monitorOvertimeSessions();
    } catch (err) {
      console.error('Error in overtime monitor', err);
    }
  }, intervalMs);

  console.log(`Overtime monitor started (interval: ${intervalMs}ms)`);
}

function stopOvertimeMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('Overtime monitor stopped');
  }
}

async function getOvertimeAlerts(sessionId = null, userId = null, limit = 100) {
  let query = `SELECT * FROM session_alerts WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (sessionId) {
    params.push(sessionId);
    query += ` AND session_id = $${paramIndex}`;
    paramIndex++;
  }

  if (userId) {
    params.push(userId);
    query += ` AND recipient_id = $${paramIndex}`;
    paramIndex++;
  }

  query += ` ORDER BY sent_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await db.query(query, params);
  
  return result.rows.map(row => ({
    alertId: row.id,
    sessionId: row.session_id,
    alertType: row.alert_type,
    message: row.message,
    sentAt: row.sent_at,
    recipientId: row.recipient_id,
  }));
}

module.exports = {
  getOvertimeRule,
  createOvertimeRule,
  checkSessionOvertime,
  calculateOvertimeFee,
  processOvertimeSession,
  forceStopCharging,
  monitorOvertimeSessions,
  startOvertimeMonitor,
  stopOvertimeMonitor,
  getOvertimeAlerts,
  sendAlert,
  OvertimeError,
};
