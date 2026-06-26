const express = require('express');
const fs = require('fs');
const path = require('path');

const stationsRouter = require('./routes/stations');
const reservationsRouter = require('./routes/reservations');
const adminRouter = require('./routes/admin');
const refundService = require('./services/refundService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/schema', (req, res) => {
  const schemaPath = path.join(__dirname, 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  res.type('text/plain').send(schema);
});

app.use('/api/v1/stations', stationsRouter);
app.use('/api/v1/reservations', reservationsRouter);
app.use('/api/v1/admin', adminRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  if (process.env.ENABLE_REFUND_SCHEDULER === 'true') {
    refundService.startRetryScheduler();
  }
});

function gracefulShutdown() {
  console.log('Received shutdown signal');
  refundService.stopRetryScheduler();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
