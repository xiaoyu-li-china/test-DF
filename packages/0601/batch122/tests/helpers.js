const request = require('supertest');
const express = require('express');

function createApp() {
  const app = express();
  const mongoose = require('mongoose');
  const cors = require('cors');

  app.use(cors());
  app.use(express.json());

  const authRoutes = require('../src/routes/auth');
  const itemRoutes = require('../src/routes/items');
  const exchangeRoutes = require('../src/routes/exchange');

  app.use('/api/auth', authRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/exchange', exchangeRoutes);

  return app;
}

async function createUserAndLogin(app, phone, password = '123456') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      phone,
      password,
      nickname: `用户${phone.slice(-4)}`
    });

  return {
    token: res.body.token,
    userId: res.body.user.id,
    user: res.body.user
  };
}

async function publishItem(app, token, itemData = {}) {
  const res = await request(app)
    .post('/api/items')
    .set('Authorization', `Bearer ${token}`)
    .field('title', itemData.title || '测试物品')
    .field('description', itemData.description || '这是一个测试物品描述')
    .field('expectedExchange', itemData.expectedExchange || '想要交换什么都行')
    .field('category', itemData.category || '其他')
    .field('haveTag', itemData.haveTag || '')
    .field('wantTag', itemData.wantTag || '');

  return res.body.item;
}

async function createExchangeRequest(app, token, offeredItemId, requestedItemId, message = '') {
  const res = await request(app)
    .post('/api/exchange')
    .set('Authorization', `Bearer ${token}`)
    .send({
      offeredItemId,
      requestedItemId,
      message
    });

  return res.body.exchangeRequest;
}

module.exports = {
  createApp,
  createUserAndLogin,
  publishItem,
  createExchangeRequest
};
