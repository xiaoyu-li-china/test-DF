const express = require('express');
const refundService = require('../services/refundService');
const priceService = require('../services/priceService');
const overtimeService = require('../services/overtimeService');
const meterService = require('../services/meterService');

const router = express.Router();

function adminAuthMiddleware(req, res, next) {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.use(adminAuthMiddleware);

router.get('/refunds/dead-letter', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const refunds = await refundService.getDeadLetterRefunds(parseInt(limit));
    
    res.json({
      total: refunds.length,
      refunds,
    });
  } catch (err) {
    console.error('Error fetching dead letter refunds', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refunds/:refundId/manual-success', async (req, res) => {
  try {
    const { refundId } = req.params;
    const { note } = req.body;
    
    const result = await refundService.manualRefundSuccess(refundId, note);
    
    res.json(result);
  } catch (err) {
    console.error('Error processing manual refund', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/refunds/retry-all', async (req, res) => {
  try {
    const count = await refundService.retryFailedRefunds();
    
    res.json({
      message: `Scheduled ${count} refunds for retry`,
      count,
    });
  } catch (err) {
    console.error('Error retrying refunds', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/price-configs', async (req, res) => {
  try {
    const { stationId, includeInactive } = req.query;
    
    const configs = await priceService.listPriceConfigs(
      stationId || null,
      includeInactive === 'true'
    );
    
    res.json({ configs });
  } catch (err) {
    console.error('Error fetching price configs', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/price-configs', async (req, res) => {
  try {
    const config = await priceService.createPriceConfig(
      req.body,
      req.headers['x-admin-id'] || 'ADMIN-001'
    );
    
    res.status(201).json({
      configId: config.id,
      name: config.name,
      stationId: config.station_id,
      baseRate: config.base_rate_cents_per_kwh,
      peakRate: config.peak_rate_cents_per_kwh,
      peakStartHour: config.peak_start_hour,
      peakEndHour: config.peak_end_hour,
    });
  } catch (err) {
    console.error('Error creating price config', err);
    if (err.name === 'PriceError') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/price-configs/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    
    const config = await priceService.updatePriceConfig(
      configId,
      req.body,
      req.headers['x-admin-id'] || 'ADMIN-001'
    );
    
    res.json({
      configId: config.id,
      name: config.name,
      baseRate: config.base_rate_cents_per_kwh,
      peakRate: config.peak_rate_cents_per_kwh,
    });
  } catch (err) {
    console.error('Error updating price config', err);
    if (err.name === 'PriceError') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/price-configs/:configId/exceptions', async (req, res) => {
  try {
    const { configId } = req.params;
    const { date, isPeak, reason } = req.body;
    
    const exception = await priceService.addPeakException(
      configId,
      date,
      isPeak,
      reason
    );
    
    res.status(201).json(exception);
  } catch (err) {
    console.error('Error adding peak exception', err);
    if (err.name === 'PriceError') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/price-configs/:configId/exceptions', async (req, res) => {
  try {
    const { configId } = req.params;
    const { fromDate, toDate } = req.query;
    
    const exceptions = await priceService.getPeakExceptions(
      configId,
      fromDate,
      toDate
    );
    
    res.json({ exceptions });
  } catch (err) {
    console.error('Error fetching peak exceptions', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/overtime-rules', async (req, res) => {
  try {
    const { stationId } = req.query;
    
    const rule = await overtimeService.getOvertimeRule(stationId || null);
    
    res.json({
      rule: {
        id: rule.id,
        stationId: rule.station_id,
        gracePeriodMinutes: rule.grace_period_minutes,
        overtimeFeeCentsPerMinute: rule.overtime_fee_cents_per_minute,
        maxOvertimeHours: rule.max_overtime_hours,
        depositDeductionPercent: rule.deposit_deduction_percent,
        autoReleaseEnabled: rule.auto_release_enabled,
      },
    });
  } catch (err) {
    console.error('Error fetching overtime rule', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/overtime-rules', async (req, res) => {
  try {
    const rule = await overtimeService.createOvertimeRule(
      req.body,
      req.headers['x-admin-id'] || 'ADMIN-001'
    );
    
    res.status(201).json({
      ruleId: rule.id,
      stationId: rule.station_id,
      gracePeriodMinutes: rule.grace_period_minutes,
      overtimeFeeCentsPerMinute: rule.overtime_fee_cents_per_minute,
      maxOvertimeHours: rule.max_overtime_hours,
      depositDeductionPercent: rule.deposit_deduction_percent,
      autoReleaseEnabled: rule.auto_release_enabled,
    });
  } catch (err) {
    console.error('Error creating overtime rule', err);
    if (err.name === 'OvertimeError') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stations/:stationId/meter-readings', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { type } = req.query;
    
    const reading = await meterService.getLatestMeterReading(stationId, type);
    
    res.json({
      readingId: reading.id,
      stationId: reading.station_id,
      meterValue: parseFloat(reading.meter_value),
      readingType: reading.reading_type,
      readingTimestamp: reading.reading_timestamp,
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

router.post('/stations/:stationId/meter-readings', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { meterValue, readingType, timestamp, sessionId, signature } = req.body;
    
    const reading = await meterService.recordMeterReading(
      stationId,
      meterValue,
      readingType,
      timestamp,
      'admin_api',
      signature,
      sessionId
    );
    
    res.status(201).json({
      readingId: reading.id,
      stationId: reading.station_id,
      meterValue: parseFloat(reading.meter_value),
      readingType: reading.reading_type,
      readingTimestamp: reading.reading_timestamp,
    });
  } catch (err) {
    console.error('Error recording meter reading', err);
    if (err.name === 'MeterError') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sessions/:sessionId/overtime', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const status = await overtimeService.checkSessionOvertime(sessionId);
    
    res.json(status);
  } catch (err) {
    console.error('Error checking session overtime', err);
    if (err.name === 'OvertimeError') {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sessions/:sessionId/force-stop', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;
    
    const result = await overtimeService.forceStopCharging(sessionId, reason || 'admin_manual');
    
    res.json(result);
  } catch (err) {
    console.error('Error force stopping session', err);
    if (err.name === 'OvertimeError') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
