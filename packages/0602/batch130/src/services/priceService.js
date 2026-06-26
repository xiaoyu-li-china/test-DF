const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const db = require('../db');

class PriceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PriceError';
    this.code = code;
  }
}

async function getPriceConfig(stationId, date = null) {
  const queryDate = date || dayjs().toDate();
  
  const result = await db.query(
    `SELECT * FROM price_configs 
     WHERE (station_id = $1 OR station_id IS NULL)
       AND effective_from <= $2
       AND (effective_to IS NULL OR effective_to > $2)
     ORDER BY 
       CASE WHEN station_id IS NOT NULL THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`,
    [stationId, queryDate]
  );

  if (result.rows.length === 0) {
    throw new PriceError('CONFIG_NOT_FOUND', '未找到价格配置');
  }

  return result.rows[0];
}

async function isPeakHour(configId, dateTime) {
  const dt = dayjs(dateTime);
  const hour = dt.hour();
  const date = dt.format('YYYY-MM-DD');

  const exceptionResult = await db.query(
    `SELECT is_peak FROM peak_period_exceptions 
     WHERE config_id = $1 AND date = $2`,
    [configId, date]
  );

  if (exceptionResult.rows.length > 0) {
    return exceptionResult.rows[0].is_peak;
  }

  const configResult = await db.query(
    `SELECT peak_start_hour, peak_end_hour FROM price_configs WHERE id = $1`,
    [configId]
  );

  if (configResult.rows.length === 0) {
    return false;
  }

  const { peak_start_hour, peak_end_hour } = configResult.rows[0];
  
  if (peak_start_hour < peak_end_hour) {
    return hour >= peak_start_hour && hour < peak_end_hour;
  } else {
    return hour >= peak_start_hour || hour < peak_end_hour;
  }
}

function splitTimeByPeakPeriod(startTime, endTime, peakStart, peakEnd) {
  const segments = [];
  let current = dayjs(startTime);
  const end = dayjs(endTime);

  while (current.isBefore(end)) {
    const hour = current.hour();
    let isPeak;
    
    if (peakStart < peakEnd) {
      isPeak = hour >= peakStart && hour < peakEnd;
    } else {
      isPeak = hour >= peakStart || hour < peakEnd;
    }

    const nextHour = current.add(1, 'hour').minute(0).second(0);
    const segmentEnd = nextHour.isBefore(end) ? nextHour : end;
    
    const durationHours = segmentEnd.diff(current, 'minute') / 60;
    
    segments.push({
      startTime: current.toDate(),
      endTime: segmentEnd.toDate(),
      durationHours,
      isPeak,
    });

    current = segmentEnd;
  }

  return segments;
}

async function calculateEnergyCost(stationId, energyKwh, startTime, endTime) {
  const config = await getPriceConfig(stationId, startTime);
  const segments = splitTimeByPeakPeriod(
    startTime,
    endTime,
    config.peak_start_hour,
    config.peak_end_hour
  );

  let baseCost = 0;
  let peakSurcharge = 0;
  let peakHours = 0;
  let baseHours = 0;

  const totalHours = dayjs(endTime).diff(startTime, 'minute') / 60;

  for (const segment of segments) {
    const segmentEnergy = energyKwh * (segment.durationHours / totalHours);
    
    if (segment.isPeak) {
      baseCost += segmentEnergy * config.base_rate_cents_per_kwh;
      peakSurcharge += segmentEnergy * (config.peak_rate_cents_per_kwh - config.base_rate_cents_per_kwh);
      peakHours += segment.durationHours;
    } else {
      baseCost += segmentEnergy * config.base_rate_cents_per_kwh;
      baseHours += segment.durationHours;
    }
  }

  return {
    baseCost: Math.round(baseCost),
    peakSurcharge: Math.round(peakSurcharge),
    totalCost: Math.round(baseCost + peakSurcharge),
    peakHours: Math.round(peakHours * 100) / 100,
    baseHours: Math.round(baseHours * 100) / 100,
    configId: config.id,
    baseRate: config.base_rate_cents_per_kwh,
    peakRate: config.peak_rate_cents_per_kwh,
  };
}

async function createPriceConfig(configData, adminId) {
  const {
    stationId,
    name,
    baseRateCentsPerKwh,
    peakRateCentsPerKwh,
    peakStartHour,
    peakEndHour,
    isDefault = false,
    effectiveFrom,
    effectiveTo,
  } = configData;

  if (baseRateCentsPerKwh <= 0) {
    throw new PriceError('INVALID_RATE', '基础电价必须大于0');
  }
  if (peakRateCentsPerKwh < baseRateCentsPerKwh) {
    throw new PriceError('INVALID_RATE', '高峰电价不能低于基础电价');
  }
  if (peakStartHour < 0 || peakStartHour > 23 || peakEndHour < 0 || peakEndHour > 23) {
    throw new PriceError('INVALID_HOUR', '时段必须在0-23之间');
  }

  const configId = `PRICE-${uuidv4().slice(0, 6).toUpperCase()}`;

  return db.transaction(async (client) => {
    if (isDefault || !stationId) {
      await client.query(
        `UPDATE price_configs SET is_default = false WHERE is_default = true AND station_id IS NULL`
      );
    }

    if (stationId) {
      await client.query(
        `UPDATE price_configs SET effective_to = $1 
         WHERE station_id = $2 AND effective_to IS NULL AND id != $3`,
        [effectiveFrom || dayjs().toDate(), stationId, configId]
      );
    }

    const result = await client.query(
      `INSERT INTO price_configs 
       (id, station_id, name, base_rate_cents_per_kwh, peak_rate_cents_per_kwh,
        peak_start_hour, peak_end_hour, is_default, created_by, effective_from, effective_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        configId, stationId || null, name,
        baseRateCentsPerKwh, peakRateCentsPerKwh,
        peakStartHour, peakEndHour,
        isDefault || !stationId,
        adminId,
        effectiveFrom || dayjs().toDate(),
        effectiveTo || null,
      ]
    );

    return result.rows[0];
  });
}

async function updatePriceConfig(configId, configData, adminId) {
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  const allowedFields = [
    'name',
    'base_rate_cents_per_kwh',
    'peak_rate_cents_per_kwh',
    'peak_start_hour',
    'peak_end_hour',
    'effective_to',
  ];

  for (const field of allowedFields) {
    const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (configData[camelField] !== undefined) {
      updateFields.push(`${field} = $${paramIndex}`);
      updateValues.push(configData[camelField]);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    throw new PriceError('NO_UPDATE_FIELDS', '没有要更新的字段');
  }

  updateFields.push(`updated_at = NOW()`);
  updateValues.push(configId);

  const result = await db.query(
    `UPDATE price_configs 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    [...updateValues]
  );

  if (result.rows.length === 0) {
    throw new PriceError('CONFIG_NOT_FOUND', '价格配置不存在');
  }

  return result.rows[0];
}

async function addPeakException(configId, date, isPeak, reason) {
  try {
    const result = await db.query(
      `INSERT INTO peak_period_exceptions (config_id, date, is_peak, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (config_id, date) DO UPDATE 
       SET is_peak = EXCLUDED.is_peak, reason = EXCLUDED.reason
       RETURNING *`,
      [configId, date, isPeak, reason]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23503') {
      throw new PriceError('CONFIG_NOT_FOUND', '价格配置不存在');
    }
    throw err;
  }
}

async function getPeakExceptions(configId, fromDate, toDate) {
  const result = await db.query(
    `SELECT * FROM peak_period_exceptions 
     WHERE config_id = $1 AND date >= $2 AND date <= $3
     ORDER BY date`,
    [configId, fromDate, toDate]
  );
  return result.rows;
}

async function listPriceConfigs(stationId = null, includeInactive = false) {
  let query = `SELECT * FROM price_configs WHERE 1=1`;
  const params = [];

  if (stationId) {
    params.push(stationId);
    query += ` AND (station_id = $${params.length} OR station_id IS NULL)`;
  }

  if (!includeInactive) {
    params.push(dayjs().toDate());
    query += ` AND effective_from <= $${params.length}`;
    query += ` AND (effective_to IS NULL OR effective_to > $${params.length})`;
  }

  query += ` ORDER BY station_id IS NULL, created_at DESC`;

  const result = await db.query(query, params);
  
  return result.rows.map(row => ({
    id: row.id,
    stationId: row.station_id,
    name: row.name,
    baseRateCentsPerKwh: row.base_rate_cents_per_kwh,
    peakRateCentsPerKwh: row.peak_rate_cents_per_kwh,
    peakStartHour: row.peak_start_hour,
    peakEndHour: row.peak_end_hour,
    isDefault: row.is_default,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
  }));
}

module.exports = {
  getPriceConfig,
  isPeakHour,
  calculateEnergyCost,
  createPriceConfig,
  updatePriceConfig,
  addPeakException,
  getPeakExceptions,
  listPriceConfigs,
  splitTimeByPeakPeriod,
  PriceError,
};
