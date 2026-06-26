const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { getUserOrderStats, getLastMonthDateRange } = require('./orderStats');

let mongoServer;
let client;
let db;
let ordersCollection;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('test');
  ordersCollection = db.collection('orders');
}, 30000);

afterAll(async () => {
  if (client) {
    await client.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await ordersCollection.deleteMany({});
});

describe('getUserOrderStats', () => {
  it('应该正确统计每个用户的总金额、平均金额和订单数量', async () => {
    const testOrders = [
      { userId: 'user1', amount: 100, createdAt: new Date('2024-05-15T10:00:00Z') },
      { userId: 'user1', amount: 200, createdAt: new Date('2024-05-16T10:00:00Z') },
      { userId: 'user1', amount: 300, createdAt: new Date('2024-05-17T10:00:00Z') },
      { userId: 'user2', amount: 500, createdAt: new Date('2024-05-18T10:00:00Z') },
      { userId: 'user2', amount: 100, createdAt: new Date('2024-05-19T10:00:00Z') },
      { userId: 'user3', amount: 250, createdAt: new Date('2024-05-20T10:00:00Z') }
    ];

    await ordersCollection.insertMany(testOrders);

    const result = await getUserOrderStats(ordersCollection);

    expect(result.rankedUsers).toHaveLength(3);

    const userMap = {};
    result.rankedUsers.forEach(u => {
      userMap[u.userId] = u;
    });

    expect(userMap.user1.totalAmount).toBe(600);
    expect(userMap.user1.avgAmount).toBeCloseTo(200, 0);
    expect(userMap.user1.orderCount).toBe(3);
    expect(userMap.user1.rank).toBe(1);

    expect(userMap.user2.totalAmount).toBe(600);
    expect(userMap.user2.avgAmount).toBeCloseTo(300, 0);
    expect(userMap.user2.orderCount).toBe(2);
    expect(userMap.user2.rank).toBe(1);

    expect(userMap.user3.totalAmount).toBe(250);
    expect(userMap.user3.avgAmount).toBe(250);
    expect(userMap.user3.orderCount).toBe(1);
    expect(userMap.user3.rank).toBe(3);

    expect(result.totalStats[0].grandTotal).toBe(1450);
    expect(result.totalStats[0].totalOrders).toBe(6);
    expect(result.totalStats[0].userCount).toBe(3);
  });

  it('应该只返回排名前 N 的用户', async () => {
    const testOrders = [];
    for (let i = 1; i <= 15; i++) {
      testOrders.push({
        userId: `user${i}`,
        amount: i * 100,
        createdAt: new Date('2024-05-15T10:00:00Z')
      });
    }
    await ordersCollection.insertMany(testOrders);

    const result = await getUserOrderStats(ordersCollection, { topN: 5 });

    expect(result.rankedUsers).toHaveLength(5);
    expect(result.rankedUsers[0].userId).toBe('user15');
    expect(result.rankedUsers[0].rank).toBe(1);
    expect(result.rankedUsers[4].userId).toBe('user11');
    expect(result.rankedUsers[4].rank).toBe(5);

    expect(result.totalStats[0].userCount).toBe(15);
  });

  it('应该根据日期范围过滤订单', async () => {
    const mayOrders = [
      { userId: 'user1', amount: 100, createdAt: new Date('2024-05-15T10:00:00Z') },
      { userId: 'user1', amount: 200, createdAt: new Date('2024-05-20T10:00:00Z') }
    ];
    const juneOrders = [
      { userId: 'user1', amount: 500, createdAt: new Date('2024-06-01T10:00:00Z') },
      { userId: 'user2', amount: 300, createdAt: new Date('2024-06-15T10:00:00Z') }
    ];

    await ordersCollection.insertMany([...mayOrders, ...juneOrders]);

    const dateRange = {
      start: new Date('2024-06-01T00:00:00Z'),
      end: new Date('2024-07-01T00:00:00Z')
    };

    const result = await getUserOrderStats(ordersCollection, { dateRange });

    expect(result.rankedUsers).toHaveLength(2);
    expect(result.totalStats[0].grandTotal).toBe(800);
    expect(result.totalStats[0].totalOrders).toBe(2);
  });

  it('应该处理空集合的情况', async () => {
    const result = await getUserOrderStats(ordersCollection);

    expect(result.rankedUsers).toHaveLength(0);
    expect(result.totalStats).toHaveLength(0);
  });

  it('应该正确计算并列排名', async () => {
    const testOrders = [
      { userId: 'user1', amount: 500, createdAt: new Date('2024-05-15T10:00:00Z') },
      { userId: 'user2', amount: 500, createdAt: new Date('2024-05-16T10:00:00Z') },
      { userId: 'user3', amount: 500, createdAt: new Date('2024-05-17T10:00:00Z') },
      { userId: 'user4', amount: 300, createdAt: new Date('2024-05-18T10:00:00Z') }
    ];

    await ordersCollection.insertMany(testOrders);

    const result = await getUserOrderStats(ordersCollection);

    expect(result.rankedUsers[0].rank).toBe(1);
    expect(result.rankedUsers[1].rank).toBe(1);
    expect(result.rankedUsers[2].rank).toBe(1);
    expect(result.rankedUsers[3].rank).toBe(4);
  });
});

describe('getLastMonthDateRange', () => {
  it('应该返回正确的上月起止时间（UTC时区）', () => {
    const mockNow = new Date('2024-06-15T12:00:00Z');
    const dateRange = getLastMonthDateRange(0, mockNow);

    expect(dateRange.start.toISOString()).toBe('2024-05-01T00:00:00.000Z');
    expect(dateRange.end.toISOString()).toBe('2024-06-01T00:00:00.000Z');
  });

  it('应该考虑时区偏移（东八区）', () => {
    const timezoneOffsetMs = 8 * 60 * 60 * 1000;
    const mockNow = new Date('2024-06-01T04:00:00Z');

    const dateRange = getLastMonthDateRange(timezoneOffsetMs, mockNow);

    const localStart = new Date(dateRange.start.getTime() + timezoneOffsetMs);
    const localEnd = new Date(dateRange.end.getTime() + timezoneOffsetMs);

    expect(localStart.getUTCFullYear()).toBe(2024);
    expect(localStart.getUTCMonth()).toBe(4);
    expect(localStart.getUTCDate()).toBe(1);
    expect(localStart.getUTCHours()).toBe(0);

    expect(localEnd.getUTCFullYear()).toBe(2024);
    expect(localEnd.getUTCMonth()).toBe(5);
    expect(localEnd.getUTCDate()).toBe(1);
    expect(localEnd.getUTCHours()).toBe(0);
  });

  it('应该正确处理跨年情况', () => {
    const mockNow = new Date('2024-01-15T12:00:00Z');
    const dateRange = getLastMonthDateRange(0, mockNow);

    expect(dateRange.start.toISOString()).toBe('2023-12-01T00:00:00.000Z');
    expect(dateRange.end.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });
});
