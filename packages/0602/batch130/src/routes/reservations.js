const express = require('express');
const reservationService = require('../services/reservationService');
const refundService = require('../services/refundService');

const router = express.Router();

function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Missing user ID' });
  }
  req.userId = userId;
  next();
}

router.use(authMiddleware);

router.post('/', async (req, res) => {
  try {
    const { stationId, slotStart, slotEnd } = req.body;
    
    if (!stationId || !slotStart || !slotEnd) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
    }
    
    const result = await reservationService.createReservation(
      req.userId,
      stationId,
      slotStart,
      slotEnd
    );
    
    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating reservation', err);
    
    if (err.name === 'ReservationError') {
      return res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:reservationId', async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const result = await reservationService.getReservation(
      reservationId,
      req.userId
    );
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching reservation', err);
    
    if (err.name === 'ReservationError') {
      return res.status(err.statusCode || 404).json({
        error: err.message,
        code: err.code,
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:reservationId', async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const result = await reservationService.cancelReservation(
      reservationId,
      req.userId
    );
    
    res.json(result);
  } catch (err) {
    console.error('Error canceling reservation', err);
    
    if (err.name === 'ReservationError') {
      return res.status(err.statusCode || 400).json({
        error: err.message,
        code: err.code,
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:reservationId/confirm', async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const result = await reservationService.confirmReservation(
      reservationId,
      req.userId
    );
    
    res.json(result);
  } catch (err) {
    console.error('Error confirming reservation', err);
    
    if (err.name === 'ReservationError') {
      return res.status(err.statusCode || 400).json({
        error: err.message,
        code: err.code,
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:reservationId/refund', async (req, res) => {
  try {
    const { reservationId } = req.params;
    const db = require('../db');
    
    const result = await db.query(
      `SELECT * FROM refunds WHERE reservation_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [reservationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    
    const refund = await refundService.getRefundStatus(result.rows[0].id);
    res.json(refund);
  } catch (err) {
    console.error('Error fetching refund status', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
