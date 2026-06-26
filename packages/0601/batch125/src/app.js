require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { testConnection, syncDatabase } = require('./models');
const errorHandler = require('./middleware/errorHandler');

const checkinRoutes = require('./routes/checkinRoutes');
const authorizationRoutes = require('./routes/authorizationRoutes');
const classRoutes = require('./routes/classRoutes');
const parentRoutes = require('./routes/parentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/v1/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { timestamp: new Date().toISOString() } });
});

app.use('/api/v1/checkin', checkinRoutes);
app.use('/api/v1/authorization', authorizationRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/parent', parentRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await testConnection();
    await syncDatabase(false);

    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`🚀 幼儿园接送签到系统服务已启动`);
      console.log(`📡 服务地址: http://localhost:${PORT}`);
      console.log(`📚 API文档: /api/v1/health`);
      console.log(`========================================\n`);
    });
  } catch (err) {
    console.error('服务启动失败:', err);
    process.exit(1);
  }
};

startServer();
