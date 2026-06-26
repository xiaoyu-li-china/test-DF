const express = require('express');
const dayjs = require('dayjs');
const db = require('../db');
const priceService = require('../services/priceService');
const meterService = require('../services/meterService');
const overtimeService = require('../services/overtimeService');

const router = express.Router();

function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Missing user ID' });
  }
  req.userId = userId;
  next();
}

router.get('/', async (req, res) => {
  try {
    const { status, date } = req.query;
    
    let query = 'SELECT * FROM stations WHERE 1=1';
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    query += ' ORDER BY id';
    
    const result = await db.query(query, params);
    
    res.json({
      stations: result.rows.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        powerKw: s.power_kw,
        status: s.status,
        location: { zone: s.zone, floor: s.floor },
        lastHeartbeatAt: s.last_heartbeat_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching stations', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    
    const result = await db.query(
      'SELECT * FROM stations WHERE id = $1',
      [stationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    const s = result.rows[0];
    res.json({
      id: s.id,
      name: s.name,
      type: s.type,
      powerKw: s.power_kw,
      status: s.status,
      location: { zone: s.zone, floor: s.floor },
      lastHeartbeatAt: s.last_heartbeat_at,
    });
  } catch (err) {
    console.error('Error fetching station', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:stationId/slots', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date = dayjs().format('YYYY-MM-DD') } = req.query;
    
    const stationResult = await db.query(
      'SELECT status FROM stations WHERE id = $1',
      [stationId]
    );
    
    if (stationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    const station = stationResult.rows[0];
    const isOffline = station.status !== 'online';
    
    const startOfDay = dayjs(date).startOf('day').hour(6);
    const slots = [];
    
    for (let i = 0; i < 9; i++) {
      const slotStart = startOfDay.add(i * 2, 'hour');
      const slotEnd = slotStart.add(2, 'hour');
      
      let status = 'available';
      let reservedBy = null;
      let reason = null;
      
      if (isOffline) {
        status = 'blocked';
        reason = 'station_offline';
      } else {
        const reservationResult = await db.query(
          `SELECT r.id, r.user_id, r.status, u.name 
           FROM reservations r
           JOIN users u ON r.user_id = u.id
           WHERE r.station_id = $1 
             AND r.slot_start = $2 
             AND r.slot_end = $3
             AND r.status IN ('pending_payment', 'confirmed', 'charging')
           LIMIT 1`,
          [stationId, slotStart.toDate(), slotEnd.toDate()]
        );
        
        if (reservationResult.rows.length > 0) {
          status = 'occupied';
          reservedBy = reservationResult.rows[0].name;
        } else if (slotStart.isBefore(dayjs())) {
          status = 'blocked';
          reason = 'slot_past';
        }
      }
      
      slots.push({
        startTime: slotStart.format(),
        endTime: slotEnd.format(),
        status,
        reservedBy,
        reason,
      });
    }
    
    res.json({
      stationId,
      date,
      slotDurationHours: 2,
      slots,
    });
  } catch (err) {
    console.error('Error fetching slots', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:stationId/price', async (req, res) => {
  try {
    const { stationId } = req.params;
    
    const config = await priceService.getPriceConfig(stationId);
    
    res.json({
      stationId,
      priceConfig: {
        id: config.id,
        name: config.name,
        baseRateCentsPerKwh: config.base_rate_cents_per_kwh,
        peakRateCentsPerKwh: config.peak_rate_cents_per_kwh,
        peakStartHour: config.peak_start_hour,
        peakEndHour: config.peak_end_hour,
        peakSurcharge: config.peak_rate_cents_per_kwh - config.base_rate_cents_per_kwh,
      },
    });
  } catch (err) {
    console.error('Error fetching price config', err);
    if (err.name === 'PriceError') {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:stationId/start', authMiddleware, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { reservationId, qrCode } = req.body;
    
    if (!reservationId) {
      return res.status(400).json({ error: 'reservationId is required' });
    }
    
    const session = await meterService.startChargingSession(
      stationId,
      reservationId,
      req.userId
    );
    
    await overtimeService.sendAlert(
      session.sessionId,
      'CHARGING_STARTED',
      `充电已开始，预计结束时间：${dayjs().add(2, 'hour').format('YYYY-MM-DD HH:mm')}`,
      req.userId
    );
    
    res.json({
      sessionId: session.sessionId,
      stationId: session.stationId,
      reservationId: session.reservationId,
      startedAt: session.startedAt,
      status: 'charging',
      startMeterValue: session.startMeterValue,
    });
  } catch (err) {
    console.error('Error starting charging', err);
    if (err.name === 'MeterError') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:stationId/stop', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    
    const settlement = await meterService.stopChargingSession(
      sessionId,
      req.userId
    );
    
    res.json(settlement);
  } catch (err) {
    console.error('Error stopping charging', err);
    if (err.name === 'MeterError') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:stationId/meter/latest', async (req, res) => {
  try {
    const { stationId } = req.params;
    
    const reading = await meterService.getLatestMeterReading(stationId);
    
    res.json({
      stationId,
      meterValue: parseFloat(reading.meter_value),
      readingTimestamp: reading.reading_timestamp,
      readingType: reading.reading_type,
      source: reading.source,
    });
  } catch (err) {
    console.error('Error fetching meter reading', err);
    if (err.name === 'MeterError') {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
