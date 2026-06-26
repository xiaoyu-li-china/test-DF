const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const ExchangeRequest = require('../models/ExchangeRequest');
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const { notifyExchangeRequested, notifyExchangeAccepted, notifyExchangeRejected } = require('../services/webhook');

const router = express.Router();

router.post('/', auth, [
  body('offeredItemId').notEmpty().withMessage('请选择您要交换出去的物品'),
  body('requestedItemId').notEmpty().withMessage('请选择您想要的物品'),
  body('message').isLength({ max: 500 }).withMessage('留言最多500字')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { offeredItemId, requestedItemId, message } = req.body;

    const session = await mongoose.startSession();
    let exchangeRequest;

    try {
      await session.withTransaction(async () => {
        const offeredItem = await Item.findById(offeredItemId).session(session);
        if (!offeredItem) {
          throw new Error('您的物品不存在');
        }

        if (offeredItem.owner.toString() !== req.user._id.toString()) {
          throw new Error('该物品不属于您');
        }

        if (offeredItem.status !== 'available') {
          throw new Error('您的物品当前不可交换');
        }

        const requestedItem = await Item.findById(requestedItemId).session(session);
        if (!requestedItem) {
          throw new Error('对方物品不存在');
        }

        if (requestedItem.owner.toString() === req.user._id.toString()) {
          throw new Error('不能交换自己的物品');
        }

        if (requestedItem.status !== 'available') {
          throw new Error('对方物品当前不可交换');
        }

        const existingRequest = await ExchangeRequest.findOne({
          fromUser: req.user._id,
          offeredItem: offeredItemId,
          requestedItem: requestedItemId,
          status: 'pending'
        }).session(session);

        if (existingRequest) {
          throw new Error('您已发起过相同的交换请求');
        }

        offeredItem.status = 'exchanging';
        offeredItem.exchangedAt = new Date();
        await offeredItem.save({ session });

        requestedItem.status = 'exchanging';
        requestedItem.exchangedAt = new Date();
        await requestedItem.save({ session });

        exchangeRequest = new ExchangeRequest({
          fromUser: req.user._id,
          toUser: requestedItem.owner,
          offeredItem: offeredItemId,
          requestedItem: requestedItemId,
          message: message || ''
        });

        await exchangeRequest.save({ session });
      });
    } finally {
      session.endSession();
    }

    await exchangeRequest.populate([
      { path: 'fromUser', select: 'nickname avatar' },
      { path: 'toUser', select: 'nickname avatar' },
      { path: 'offeredItem', select: 'title images status' },
      { path: 'requestedItem', select: 'title images status' }
    ]);

    res.status(201).json({
      message: '交换请求已发送',
      exchangeRequest
    });

    notifyExchangeRequested(exchangeRequest).catch(err => {
      console.error('[Webhook] 交换请求通知失败:', err.message);
    });
  } catch (error) {
    if (error.message.includes('不存在') || error.message.includes('不属于您') ||
        error.message.includes('不能交换') || error.message.includes('不可交换') ||
        error.message.includes('已发起')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: '发起交换请求失败', error: error.message });
    }
  }
});

router.get('/sent', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const query = { fromUser: req.user._id };
    if (status) {
      query.status = status;
    }

    const requests = await ExchangeRequest.find(query)
      .populate('toUser', 'nickname avatar')
      .populate('offeredItem', 'title images status')
      .populate('requestedItem', 'title images status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ExchangeRequest.countDocuments(query);

    res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取发起的请求失败', error: error.message });
  }
});

router.get('/received', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const query = { toUser: req.user._id };
    if (status) {
      query.status = status;
    }

    const requests = await ExchangeRequest.find(query)
      .populate('fromUser', 'nickname avatar')
      .populate('offeredItem', 'title images status')
      .populate('requestedItem', 'title images status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ExchangeRequest.countDocuments(query);

    res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取收到的请求失败', error: error.message });
  }
});

router.put('/:id/accept', auth, async (req, res) => {
  const session = await mongoose.startSession();
  let exchangeRequest;

  try {
    await session.withTransaction(async () => {
      exchangeRequest = await ExchangeRequest.findOneAndUpdate(
        { _id: req.params.id, status: 'pending' },
        { status: 'accepted' },
        { new: true, session }
      );

      if (!exchangeRequest) {
        const existing = await ExchangeRequest.findById(req.params.id).session(session);
        if (!existing) {
          return res.status(404).json({ message: '交换请求不存在' });
        }
        if (existing.toUser.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: '无权限操作此请求' });
        }
        return res.status(400).json({ message: '该请求已被处理' });
      }

      if (exchangeRequest.toUser.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: '无权限操作此请求' });
      }

      const offeredItem = await Item.findOneAndUpdate(
        { _id: exchangeRequest.offeredItem, status: 'exchanging' },
        { status: 'completed' },
        { new: true, session }
      );

      const requestedItem = await Item.findOneAndUpdate(
        { _id: exchangeRequest.requestedItem, status: 'exchanging' },
        { status: 'completed' },
        { new: true, session }
      );

      if (!offeredItem || !requestedItem) {
        return res.status(400).json({ message: '物品状态已变更，无法完成交换' });
      }

      await ExchangeRequest.updateMany(
        {
          $or: [
            { offeredItem: exchangeRequest.offeredItem },
            { requestedItem: exchangeRequest.offeredItem },
            { offeredItem: exchangeRequest.requestedItem },
            { requestedItem: exchangeRequest.requestedItem }
          ],
          _id: { $ne: exchangeRequest._id },
          status: 'pending'
        },
        { status: 'rejected' },
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  if (!res.headersSent) {
    await exchangeRequest.populate([
      { path: 'fromUser', select: 'nickname avatar' },
      { path: 'toUser', select: 'nickname avatar' },
      { path: 'offeredItem', select: 'title images status' },
      { path: 'requestedItem', select: 'title images status' }
    ]);

    res.json({
      message: '已同意交换',
      exchangeRequest
    });

    notifyExchangeAccepted(exchangeRequest).catch(err => {
      console.error('[Webhook] 同意交换通知失败:', err.message);
    });
  }
});

router.put('/:id/reject', auth, async (req, res) => {
  const session = await mongoose.startSession();
  let exchangeRequest;

  try {
    await session.withTransaction(async () => {
      exchangeRequest = await ExchangeRequest.findOneAndUpdate(
        { _id: req.params.id, status: 'pending' },
        { status: 'rejected' },
        { new: true, session }
      );

      if (!exchangeRequest) {
        const existing = await ExchangeRequest.findById(req.params.id).session(session);
        if (!existing) {
          return res.status(404).json({ message: '交换请求不存在' });
        }
        if (existing.toUser.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: '无权限操作此请求' });
        }
        return res.status(400).json({ message: '该请求已被处理' });
      }

      if (exchangeRequest.toUser.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: '无权限操作此请求' });
      }

      await Item.findByIdAndUpdate(
        exchangeRequest.offeredItem,
        { status: 'available', exchangedAt: null },
        { session }
      );

      await Item.findByIdAndUpdate(
        exchangeRequest.requestedItem,
        { status: 'available', exchangedAt: null },
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  if (!res.headersSent) {
    await exchangeRequest.populate([
      { path: 'fromUser', select: 'nickname avatar' },
      { path: 'toUser', select: 'nickname avatar' },
      { path: 'offeredItem', select: 'title images status' },
      { path: 'requestedItem', select: 'title images status' }
    ]);

    res.json({
      message: '已拒绝交换',
      exchangeRequest
    });

    notifyExchangeRejected(exchangeRequest).catch(err => {
      console.error('[Webhook] 拒绝交换通知失败:', err.message);
    });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const exchangeRequest = await ExchangeRequest.findById(req.params.id)
      .populate('fromUser', 'nickname avatar phone')
      .populate('toUser', 'nickname avatar phone')
      .populate('offeredItem', 'title images description expectedExchange status')
      .populate('requestedItem', 'title images description expectedExchange status');

    if (!exchangeRequest) {
      return res.status(404).json({ message: '交换请求不存在' });
    }

    if (
      exchangeRequest.fromUser._id.toString() !== req.user._id.toString() &&
      exchangeRequest.toUser._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: '无权限查看此请求' });
    }

    res.json({ exchangeRequest });
  } catch (error) {
    res.status(500).json({ message: '获取详情失败', error: error.message });
  }
});

module.exports = router;
