const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', auth, upload.array('images', 5), [
  body('title').notEmpty().withMessage('标题不能为空').isLength({ max: 100 }).withMessage('标题最多100字'),
  body('description').notEmpty().withMessage('描述不能为空').isLength({ max: 1000 }).withMessage('描述最多1000字'),
  body('expectedExchange').notEmpty().withMessage('期望交换物品不能为空').isLength({ max: 200 }).withMessage('期望交换最多200字')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, expectedExchange, category, haveTag, wantTag, saveAsDraft } = req.body;
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const status = saveAsDraft === 'true' ? 'draft' : 'available';

    const item = new Item({
      title,
      description,
      images,
      expectedExchange,
      category: category || '其他',
      haveTag: haveTag || '',
      wantTag: wantTag || '',
      status,
      owner: req.user._id
    });

    await item.save();
    await item.populate('owner', 'nickname avatar');

    res.status(201).json({
      message: saveAsDraft === 'true' ? '已保存为草稿' : '发布成功',
      item
    });
  } catch (error) {
    res.status(500).json({ message: '操作失败', error: error.message });
  }
});

router.put('/:id/publish', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限操作' });
    }

    if (item.status !== 'draft') {
      return res.status(400).json({ message: '只有草稿可以发布' });
    }

    item.status = 'available';
    item.isDraft = false;
    await item.save();

    res.json({
      message: '发布成功',
      item
    });
  } catch (error) {
    res.status(500).json({ message: '发布失败', error: error.message });
  }
});

router.put('/:id/restore', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限操作' });
    }

    if (item.status !== 'removed') {
      return res.status(400).json({ message: '只有已下架的物品可以重新上架' });
    }

    item.status = 'available';
    await item.save();

    res.json({
      message: '已重新上架',
      item
    });
  } catch (error) {
    res.status(500).json({ message: '操作失败', error: error.message });
  }
});

router.get('/match', auth, async (req, res) => {
  try {
    const myItems = await Item.find({
      owner: req.user._id,
      status: { $in: ['available', 'exchanging'] }
    }).select('haveTag wantTag title images');

    if (myItems.length === 0) {
      return res.json({ matches: [], message: '您还没有可交换的物品' });
    }

    const myHaveTags = [...new Set(myItems.map(i => i.haveTag).filter(Boolean))];
    const myWantTags = [...new Set(myItems.map(i => i.wantTag).filter(Boolean))];

    const matchConditions = [];

    if (myHaveTags.length > 0) {
      matchConditions.push({ wantTag: { $in: myHaveTags } });
    }
    if (myWantTags.length > 0) {
      matchConditions.push({ haveTag: { $in: myWantTags } });
    }

    if (matchConditions.length === 0) {
      return res.json({ matches: [], message: '请为您的物品设置意向标签以获得推荐' });
    }

    const matches = await Item.find({
      $or: matchConditions,
      status: { $in: ['available', 'exchanging'] },
      owner: { $ne: req.user._id }
    })
      .populate('owner', 'nickname avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    const scored = matches.map(item => {
      let score = 0;
      const myItemIds = myItems.map(i => i._id.toString());

      if (myHaveTags.includes(item.wantTag) && item.wantTag) score += 10;
      if (myWantTags.includes(item.haveTag) && item.haveTag) score += 10;

      const perfectMatch = myItems.some(my =>
        my.haveTag && my.wantTag &&
        my.haveTag === item.wantTag && my.wantTag === item.haveTag
      );
      if (perfectMatch) score += 20;

      return { ...item.toObject(), matchScore: score };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      matches: scored,
      myHaveTags,
      myWantTags
    });
  } catch (error) {
    res.status(500).json({ message: '匹配推荐失败', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const status = req.query.status || 'available';
    const keyword = req.query.keyword;
    const sortBy = req.query.sortBy;
    const lng = parseFloat(req.query.lng);
    const lat = parseFloat(req.query.lat);
    const maxDistance = parseInt(req.query.maxDistance) || 5000;

    const query = { status: { $ne: 'draft' } };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (category && category !== '全部') {
      query.category = category;
    }
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (sortBy === 'distance' && !isNaN(lng) && !isNaN(lat)) {
      const userLocation = {
        type: 'Point',
        coordinates: [lng, lat]
      };

      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner'
          }
        },
        { $unwind: '$owner' },
        {
          $addFields: {
            distance: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$owner.location', null] },
                    { $gt: [{ $size: { $ifNull: ['$owner.location.coordinates', []] } }, 1] }
                  ]
                },
                then: {
                  $round: [
                    {
                      $divide: [
                        {
                          $sqrt: {
                            $add: [
                              {
                                $pow: [
                                  {
                                    $multiply: [
                                      {
                                        $subtract: [
                                          { $arrayElemAt: ['$owner.location.coordinates', 0] },
                                          lng
                                        ]
                                      },
                                      111000
                                    ]
                                  },
                                  2
                                ]
                              },
                              {
                                $pow: [
                                  {
                                    $multiply: [
                                      {
                                        $subtract: [
                                          { $arrayElemAt: ['$owner.location.coordinates', 1] },
                                          lat
                                        ]
                                      },
                                      111000
                                    ]
                                  },
                                  2
                                ]
                              }
                            ]
                          }
                        },
                        1
                      ]
                    },
                    0
                  ]
                },
                else: null
              }
            }
          }
        },
        {
          $match: {
            $or: [
              { distance: { $ne: null, $lte: maxDistance } },
              { distance: null }
            ]
          }
        },
        { $sort: { distance: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            title: 1,
            description: 1,
            images: 1,
            expectedExchange: 1,
            haveTag: 1,
            wantTag: 1,
            category: 1,
            status: 1,
            createdAt: 1,
            distance: 1,
            owner: {
              _id: 1,
              nickname: 1,
              avatar: 1
            }
          }
        }
      ];

      const items = await Item.aggregate(pipeline);

      const countPipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner'
          }
        },
        { $unwind: '$owner' },
        {
          $count: 'total'
        }
      ];
      const countResult = await Item.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      return res.json({
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    const items = await Item.find(query)
      .populate('owner', 'nickname avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Item.countDocuments(query);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取列表失败', error: error.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const query = { owner: req.user._id };
    if (status) {
      query.status = status;
    }

    const items = await Item.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Item.countDocuments(query);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取我的物品失败', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('owner', 'nickname avatar phone');

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    if (item.status === 'draft') {
      return res.status(404).json({ message: '物品不存在' });
    }

    res.json({ item });
  } catch (error) {
    res.status(500).json({ message: '获取详情失败', error: error.message });
  }
});

router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限修改' });
    }

    const { title, description, expectedExchange, category, status, haveTag, wantTag } = req.body;

    if (title) item.title = title;
    if (description) item.description = description;
    if (expectedExchange) item.expectedExchange = expectedExchange;
    if (category) item.category = category;
    if (status) item.status = status;
    if (haveTag !== undefined) item.haveTag = haveTag;
    if (wantTag !== undefined) item.wantTag = wantTag;

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      item.images = [...item.images, ...newImages];
    }

    await item.save();

    res.json({
      message: '更新成功',
      item
    });
  } catch (error) {
    res.status(500).json({ message: '更新失败', error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: '物品不存在' });
    }

    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '无权限删除' });
    }

    if (item.status === 'draft') {
      item.status = 'deleted';
      await item.save();
      res.json({ message: '草稿已删除' });
    } else {
      item.status = 'removed';
      await item.save();
      res.json({ message: '物品已下架' });
    }
  } catch (error) {
    res.status(500).json({ message: '操作失败', error: error.message });
  }
});

module.exports = router;
