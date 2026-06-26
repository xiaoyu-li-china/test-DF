const request = require('supertest');
const { createApp, createUserAndLogin, publishItem, createExchangeRequest } = require('./helpers');
const Item = require('../src/models/Item');
const ExchangeRequest = require('../src/models/ExchangeRequest');

describe('交换流程集成测试', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('场景1：完整流程 - 发布→请求→同意→完成', () => {
    let userA, userB;
    let itemA, itemB;
    let exchangeRequest;

    test('步骤1：用户A和用户B注册登录', async () => {
      userA = await createUserAndLogin(app, '13800000001');
      userB = await createUserAndLogin(app, '13800000002');

      expect(userA.token).toBeTruthy();
      expect(userB.token).toBeTruthy();
    });

    test('步骤2：用户A发布物品（儿童自行车）', async () => {
      itemA = await publishItem(app, userA.token, {
        title: '儿童自行车',
        description: '9成新，适合3-6岁儿童',
        expectedExchange: '儿童绘本',
        haveTag: '自行车',
        wantTag: '绘本'
      });

      expect(itemA).toBeTruthy();
      expect(itemA.title).toBe('儿童自行车');
      expect(itemA.status).toBe('available');
    });

    test('步骤3：用户B发布物品（儿童绘本套装）', async () => {
      itemB = await publishItem(app, userB.token, {
        title: '儿童绘本套装',
        description: '20本绘本，适合3-6岁',
        expectedExchange: '自行车或玩具',
        haveTag: '绘本',
        wantTag: '自行车'
      });

      expect(itemB).toBeTruthy();
      expect(itemB.title).toBe('儿童绘本套装');
      expect(itemB.status).toBe('available');
    });

    test('步骤4：用户A向用户B发起交换请求，物品状态变为exchanging', async () => {
      exchangeRequest = await createExchangeRequest(
        app,
        userA.token,
        itemA._id,
        itemB._id,
        '我想用自行车换你的绘本'
      );

      expect(exchangeRequest).toBeTruthy();
      expect(exchangeRequest.status).toBe('pending');

      const updatedItemA = await Item.findById(itemA._id);
      const updatedItemB = await Item.findById(itemB._id);
      expect(updatedItemA.status).toBe('exchanging');
      expect(updatedItemB.status).toBe('exchanging');
    });

    test('步骤5：用户B收到交换请求', async () => {
      const res = await request(app)
        .get('/api/exchange/received')
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(1);
      expect(res.body.requests[0]._id).toBe(exchangeRequest._id);
      expect(res.body.requests[0].message).toBe('我想用自行车换你的绘本');
    });

    test('步骤6：用户B同意交换，物品状态变为completed', async () => {
      const res = await request(app)
        .put(`/api/exchange/${exchangeRequest._id}/accept`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.exchangeRequest.status).toBe('accepted');
    });

    test('步骤7：验证两个物品状态变为completed', async () => {
      const updatedItemA = await Item.findById(itemA._id);
      const updatedItemB = await Item.findById(itemB._id);

      expect(updatedItemA.status).toBe('completed');
      expect(updatedItemB.status).toBe('completed');
    });

    test('步骤8：验证交换请求状态已更新', async () => {
      const updatedRequest = await ExchangeRequest.findById(exchangeRequest._id);
      expect(updatedRequest.status).toBe('accepted');
    });

    test('步骤9：用户A的已发送请求显示完成', async () => {
      const res = await request(app)
        .get('/api/exchange/sent?status=accepted')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(1);
      expect(res.body.requests[0].status).toBe('accepted');
    });
  });

  describe('场景2：拒绝后再次请求', () => {
    let userA, userB;
    let itemA, itemB;

    beforeAll(async () => {
      userA = await createUserAndLogin(app, '13800000011');
      userB = await createUserAndLogin(app, '13800000012');
      itemA = await publishItem(app, userA.token, {
        title: '电风扇',
        description: '美的电风扇',
        expectedExchange: '电饭煲'
      });
      itemB = await publishItem(app, userB.token, {
        title: '电饭煲',
        description: '苏泊尔电饭煲',
        expectedExchange: '电风扇'
      });
    });

    test('步骤1：用户A发起第一次交换请求，物品变为exchanging', async () => {
      const res = await request(app)
        .post('/api/exchange')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          offeredItemId: itemA._id,
          requestedItemId: itemB._id,
          message: '第一次请求'
        });

      expect(res.status).toBe(201);
      expect(res.body.exchangeRequest.status).toBe('pending');

      const updatedItemA = await Item.findById(itemA._id);
      const updatedItemB = await Item.findById(itemB._id);
      expect(updatedItemA.status).toBe('exchanging');
      expect(updatedItemB.status).toBe('exchanging');
    });

    test('步骤2：用户B拒绝请求，物品回退到available', async () => {
      const requests = await request(app)
        .get('/api/exchange/received')
        .set('Authorization', `Bearer ${userB.token}`);

      const requestId = requests.body.requests[0]._id;

      const res = await request(app)
        .put(`/api/exchange/${requestId}/reject`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.exchangeRequest.status).toBe('rejected');

      const updatedItemA = await Item.findById(itemA._id);
      const updatedItemB = await Item.findById(itemB._id);
      expect(updatedItemA.status).toBe('available');
      expect(updatedItemB.status).toBe('available');
    });

    test('步骤3：用户A再次发起相同请求应该成功（拒绝后可重新请求）', async () => {
      const res = await request(app)
        .post('/api/exchange')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          offeredItemId: itemA._id,
          requestedItemId: itemB._id,
          message: '第二次请求，请考虑一下'
        });

      expect(res.status).toBe(201);
      expect(res.body.exchangeRequest.status).toBe('pending');
    });

    test('步骤4：验证待处理请求只有一个（最新的）', async () => {
      const res = await request(app)
        .get('/api/exchange/received?status=pending')
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(1);
      expect(res.body.requests[0].message).toBe('第二次请求，请考虑一下');
    });

    test('步骤5：验证已拒绝的请求也记录在案', async () => {
      const res = await request(app)
        .get('/api/exchange/received?status=rejected')
        .set('Authorization', `Bearer ${userB.token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(1);
      expect(res.body.requests[0].message).toBe('第一次请求');
    });
  });

  describe('场景3：并发两人同意同一物品（竞态条件）', () => {
    let userA, userB, userC;
    let itemA, itemB, itemC;

    beforeAll(async () => {
      userA = await createUserAndLogin(app, '13800000021');
      userB = await createUserAndLogin(app, '13800000022');
      userC = await createUserAndLogin(app, '13800000023');
    });

    test('步骤1：用户A发布抢手物品', async () => {
      itemA = await publishItem(app, userA.token, {
        title: 'iPhone 13',
        description: '99新，全原装',
        expectedExchange: '其他数码产品'
      });
      expect(itemA.status).toBe('available');
    });

    test('步骤2：用户B发布物品用于交换', async () => {
      itemB = await publishItem(app, userB.token, {
        title: 'iPad Air',
        description: 'iPad Air 4代',
        expectedExchange: '手机'
      });
    });

    test('步骤3：用户C发布物品用于交换', async () => {
      itemC = await publishItem(app, userC.token, {
        title: 'MacBook Pro',
        description: 'MacBook Pro 13寸',
        expectedExchange: '手机'
      });
    });

    test('步骤4：用户B和用户C同时向用户A发起请求', async () => {
      const [reqB, reqC] = await Promise.all([
        request(app)
          .post('/api/exchange')
          .set('Authorization', `Bearer ${userB.token}`)
          .send({
            offeredItemId: itemB._id,
            requestedItemId: itemA._id,
            message: '用户B想用iPad换iPhone'
          }),
        request(app)
          .post('/api/exchange')
          .set('Authorization', `Bearer ${userC.token}`)
          .send({
            offeredItemId: itemC._id,
            requestedItemId: itemA._id,
            message: '用户C想用MacBook换iPhone'
          })
      ]);

      expect(reqB.status).toBe(201);
      expect(reqC.status).toBe(201);
    });

    test('步骤5：用户A收到两个待处理请求，两个请求的物品状态都是exchanging', async () => {
      const res = await request(app)
        .get('/api/exchange/received?status=pending')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(2);

      const updatedItemA = await Item.findById(itemA._id);
      const updatedItemB = await Item.findById(itemB._id);
      const updatedItemC = await Item.findById(itemC._id);

      expect(updatedItemA.status).toBe('exchanging');
      expect(updatedItemB.status).toBe('exchanging');
      expect(updatedItemC.status).toBe('exchanging');
    });

    test('步骤6：用户A同意用户B的请求', async () => {
      const requests = await request(app)
        .get('/api/exchange/received?status=pending')
        .set('Authorization', `Bearer ${userA.token}`);

      const userBRequest = requests.body.requests.find(
        r => r.message === '用户B想用iPad换iPhone'
      );

      const res = await request(app)
        .put(`/api/exchange/${userBRequest._id}/accept`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.exchangeRequest.status).toBe('accepted');
    });

    test('步骤7：验证iPhone和iPad状态变为completed', async () => {
      const updatedItemA = await Item.findById(itemA._id);
      const updatedItemB = await Item.findById(itemB._id);
      expect(updatedItemA.status).toBe('completed');
      expect(updatedItemB.status).toBe('completed');
    });

    test('步骤8：用户C的请求应该被自动拒绝，其物品回退到available', async () => {
      const requests = await request(app)
        .get('/api/exchange/sent')
        .set('Authorization', `Bearer ${userC.token}`);

      const userCRequest = requests.body.requests.find(
        r => r.message === '用户C想用MacBook换iPhone'
      );

      expect(userCRequest.status).toBe('rejected');

      const updatedItemC = await Item.findById(itemC._id);
      expect(updatedItemC.status).toBe('available');
    });

    test('步骤9：用户C不能再向已完成的物品发起新请求', async () => {
      const res = await request(app)
        .post('/api/exchange')
        .set('Authorization', `Bearer ${userC.token}`)
        .send({
          offeredItemId: itemC._id,
          requestedItemId: itemA._id,
          message: '再次尝试'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('不可交换');
    });
  });

  describe('场景4：草稿功能测试', () => {
    let userA;
    let draftItem;

    beforeAll(async () => {
      userA = await createUserAndLogin(app, '13800000031');
    });

    test('步骤1：用户A保存物品为草稿', async () => {
      const res = await request(app)
        .post('/api/items?saveAsDraft=true')
        .set('Authorization', `Bearer ${userA.token}`)
        .field('title', '草稿物品')
        .field('description', '草稿描述')
        .field('expectedExchange', '随便换');

      expect(res.status).toBe(201);
      expect(res.body.item.status).toBe('draft');
      draftItem = res.body.item;
    });

    test('步骤2：草稿不会出现在公开列表中', async () => {
      const res = await request(app).get('/api/items');
      const titles = res.body.items.map(i => i.title);
      expect(titles).not.toContain('草稿物品');
    });

    test('步骤3：草稿在我的发布中可见', async () => {
      const res = await request(app)
        .get('/api/items/my?status=draft')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].title).toBe('草稿物品');
    });

    test('步骤4：发布草稿', async () => {
      const res = await request(app)
        .put(`/api/items/${draftItem._id}/publish`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.item.status).toBe('available');
    });

    test('步骤5：发布后出现在公开列表中', async () => {
      const res = await request(app).get('/api/items');
      const titles = res.body.items.map(i => i.title);
      expect(titles).toContain('草稿物品');
    });
  });

  describe('场景5：竞态条件 - 同时同意两个请求', () => {
    let userA, userB, userC;
    let itemA, itemB, itemC;

    beforeAll(async () => {
      userA = await createUserAndLogin(app, '13800000041');
      userB = await createUserAndLogin(app, '13800000042');
      userC = await createUserAndLogin(app, '13800000043');

      itemA = await publishItem(app, userA.token, {
        title: 'Switch游戏机',
        description: '99新，带游戏',
        expectedExchange: 'PS5或其他'
      });
      itemB = await publishItem(app, userB.token, {
        title: 'PS4 Pro',
        description: 'PS4 Pro 1TB',
        expectedExchange: 'Switch'
      });
      itemC = await publishItem(app, userC.token, {
        title: 'Xbox One',
        description: 'Xbox One S',
        expectedExchange: 'Switch'
      });

      await request(app)
        .post('/api/exchange')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          offeredItemId: itemB._id,
          requestedItemId: itemA._id,
          message: 'PS4换Switch'
        });

      await request(app)
        .post('/api/exchange')
        .set('Authorization', `Bearer ${userC.token}`)
        .send({
          offeredItemId: itemC._id,
          requestedItemId: itemA._id,
          message: 'Xbox换Switch'
        });
    });

    test('同时同意两个请求，只有一个能成功', async () => {
      const requests = await request(app)
        .get('/api/exchange/received?status=pending')
        .set('Authorization', `Bearer ${userA.token}`);

      const reqB = requests.body.requests.find(r => r.message === 'PS4换Switch');
      const reqC = requests.body.requests.find(r => r.message === 'Xbox换Switch');

      const [resB, resC] = await Promise.all([
        request(app)
          .put(`/api/exchange/${reqB._id}/accept`)
          .set('Authorization', `Bearer ${userA.token}`),
        request(app)
          .put(`/api/exchange/${reqC._id}/accept`)
          .set('Authorization', `Bearer ${userA.token}`)
      ]);

      const successCount = [resB, resC].filter(r => r.status === 200).length;
      const failCount = [resB, resC].filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      const finalItemA = await Item.findById(itemA._id);
      expect(finalItemA.status).toBe('completed');
    });
  });
});
