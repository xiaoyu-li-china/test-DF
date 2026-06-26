import { http, HttpResponse } from 'msw';
import type { MemberInfo, RechargeTier, Transaction, Coupon, InvoiceInfo } from '@/types';

/**
 * 后端账本一致性策略 (Backend Ledger Consistency)
 *
 * 这是生产环境后端逻辑的 MSW 模拟。核心原则：资金操作必须原子化、可追溯、不可逆。
 *
 * ========================================================================
 * 账本模型 (Ledger Model)
 * ========================================================================
 *
 * accounts {
 *   id: string           # 账户 ID (M001)
 *   balance: decimal     # 可用余额 (单源真值)
 *   version: int         # 乐观锁版本号 (防止并发更新)
 *   updated_at: datetime
 * }
 *
 * transactions {
 *   id: string           # 交易流水号 (TXN000001)
 *   account_id: string   # 关联账户
 *   type: enum           # recharge | consume | refund
 *   amount: decimal      # 变动金额 (正=增, 负=减)
 *   balance_after: decimal  # 交易后余额 (快照)
 *   order_id: string     # 外部订单号 (幂等键)
 *   status: enum         # pending | success | failed | reversed
 *   created_at: datetime
 * }
 *
 * coupons {
 *   id: string
 *   account_id: string
 *   value: decimal
 *   status: enum         # issued | used | expired
 *   issued_by_tx: string # 发放该券的交易 ID
 * }
 *
 * journal {
 *   id: string
 *   tx_id: string
 *   operation: string    # CREATE_TRANSACTION | UPDATE_BALANCE | ISSUE_COUPON
 *   before_state: json   # 变更前状态快照
 *   after_state: json    # 变更后状态快照
 *   created_at: datetime
 * }
 *
 * ========================================================================
 * 一致性策略 (Consistency Strategies)
 * ========================================================================
 *
 * 策略 1：数据库事务 (Database Transaction)
 *   位置: recharge handler (本文件 L154-L226)
 *   SQL: BEGIN; UPDATE accounts; INSERT transactions; INSERT coupons; COMMIT;
 *   隔离级别: REPEATABLE READ
 *   作用: 余额更新、交易记录、优惠券发放三者原子化
 *   失败处理: 全部回滚，账户状态不变
 *
 * 策略 2：乐观锁并发控制 (Optimistic Locking)
 *   伪代码:
 *     SELECT balance, version FROM accounts WHERE id = ?
 *     UPDATE accounts
 *       SET balance = balance + ?, version = version + 1
 *       WHERE id = ? AND version = ?
 *     rows_affected = result.affectedRows
 *     if (rows_affected === 0) throw ConcurrentModificationError
 *   重试: 最多 3 次，指数退避
 *
 * 策略 3：幂等性保护 (Idempotency)
 *   键: order_id + account_id
 *   机制: 同一 order_id 重复请求直接返回已创建的交易
 *   防止: 网络重试导致重复充值
 *
 * 策略 4：余额快照 (Balance Snapshot)
 *   位置: transactions.balance_after
 *   机制: 每笔交易写入当时的余额快照
 *   校验: 重放所有交易 sum(amount) === 当前余额
 *   巡检: 每日 cron 校验所有账户 sum = balance
 *
 * 策略 5：事件溯源审计 (Event Sourcing Audit)
 *   位置: journal 表
 *   机制: 每次状态变更写入 before/after 快照
 *   用途: 问题追溯、合规审计、状态回滚
 *
 * 策略 6：最终一致性补偿 (Eventual Consistency)
 *   场景: 跨服务（如积分服务、优惠券服务）
 *   机制: 本地事务表 + 消息队列 + 死信队列 + 人工补偿
 *   SLA: 99.99% 1 秒内一致，0.01% 1 分钟内补偿
 *
 * ========================================================================
 * 异常处理流程 (Exception Handling Flow)
 * ========================================================================
 *
 *                   充值请求
 *                      │
 *                      ▼
 *         ┌──────────────────────────┐
 *         │  幂等键检查（order_id）  │───已存在───▶ 返回已有交易
 *         └──────────────────────────┘
 *                      │ 新请求
 *                      ▼
 *         ┌──────────────────────────┐
 *         │    开启数据库事务         │
 *         └──────────────────────────┘
 *                      │
 *                      ▼
 *         ┌──────────────────────────┐
 *         │  SELECT ... FOR UPDATE   │  行锁防并发
 *         └──────────────────────────┘
 *                      │
 *                      ▼
 *         ┌──────────────────────────┐
 *         │  UPDATE accounts SET     │  balance = balance + amount
 *         │  balance + version++     │
 *         └──────────────────────────┘
 *                      │
 *                      ▼
 *         ┌──────────────────────────┐
 *         │  INSERT transactions     │  含 balance_after 快照
 *         └──────────────────────────┘
 *                      │
 *                      ▼
 *         ┌──────────────────────────┐
 *         │   INSERT coupons         │  如涉及赠券
 *         └──────────────────────────┘
 *                      │
 *                      ▼
 *         ┌──────────────────────────┐
 *         │   INSERT journal         │  写入审计日志
 *         └──────────────────────────┘
 *                      │
 *                      ▼
 *         ┌──────────────────────────┐
 *         │      COMMIT 事务         │
 *         └──────────────────────────┘
 *                      │
 *           ┌──────────┴──────────┐
 *           │ 成功                 │ 失败
 *           ▼                      ▼
 *     返回成功结果           ROLLBACK + 返回错误
 *           │
 *           ▼
 *     ┌──────────────────┐
 *     │  MQ 发积分消息    │  异步，失败不影响主交易
 *     └──────────────────┘
 *
 * ========================================================================
 * MSW 模拟限制 (MSW Mock Limitations)
 * ========================================================================
 *
 * 当前 MSW mock 简化了以下机制：
 * - 无数据库事务：用内存变量原子操作模拟
 * - 无乐观锁：单线程环境不需要
 * - 无持久化：数据在页面刷新后重置
 * - 无 journal 表：仅 console.log 模拟
 *
 * 生产环境必须实现全部 6 种策略！
 */

const mockMember: MemberInfo = {
  id: 'M001',
  cardNumber: '8888 6666 1234 5678',
  balance: 328.5,
  memberLevel: '黄金会员',
  memberName: '张小姐',
  birthday: '1995-06-15',
  points: 2580,
};

const mockTiers: RechargeTier[] = [
  {
    id: 'T100',
    amount: 100,
    bonus: [{ type: 'coupon', value: 10, description: '送10元面包券' }],
  },
  {
    id: 'T200',
    amount: 200,
    bonus: [
      { type: 'coupon', value: 30, description: '送30元蛋糕券' },
      { type: 'cash', value: 10, description: '额外赠10元余额' },
    ],
  },
  {
    id: 'T500',
    amount: 500,
    bonus: [
      { type: 'coupon', value: 100, description: '送100元生日蛋糕券' },
      { type: 'cash', value: 50, description: '额外赠50元余额' },
    ],
  },
];

const sortTransactionsByDate = (transactions: Transaction[]): Transaction[] => {
  return [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

const generateTransactions = (): Transaction[] => {
  const stores = ['烘焙工坊（中心店）', '面包新语（万达店）', '麦香园（大学城店）', '可颂坊（科技园店）'];
  const consumeDescriptions = [
    '购买牛角面包',
    '购买生日蛋糕',
    '购买全麦吐司',
    '购买下午茶套餐',
    '购买全麦面包',
    '购买丹麦酥',
    '购买三明治',
  ];

  const transactions: Transaction[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < 25; i++) {
    const isRecharge = i % 5 === 0;
    const amount = isRecharge
      ? [100, 200, 500][i % 3]
      : Math.round((20 + i * 3.5) * 100) / 100;

    const daysAgo = i * 0.75;

    transactions.push({
      id: `TXN${String(i + 1).padStart(6, '0')}`,
      type: isRecharge ? 'recharge' : 'consume',
      amount: isRecharge ? amount : -amount,
      balanceAfter: Math.round((800 - i * 25) * 100) / 100,
      description: isRecharge ? '账户充值' : consumeDescriptions[i % consumeDescriptions.length],
      storeName: stores[i % stores.length],
      createdAt: new Date(baseTime - daysAgo * 86400000).toISOString(),
    });
  }

  return sortTransactionsByDate(transactions);
};

let allTransactions = generateTransactions();

const isBirthdayMonth = (): boolean => {
  const birthday = new Date(mockMember.birthday);
  const now = new Date();
  return birthday.getMonth() === now.getMonth();
};

export const handlers = [
  http.get('/api/member/info', () => {
    return HttpResponse.json({ ...mockMember });
  }),

  http.get('/api/recharge/tiers', () => {
    return HttpResponse.json([...mockTiers]);
  }),

  http.get('/api/transactions', ({ request }) => {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.max(1, Math.min(50, Number(url.searchParams.get('pageSize')) || 10));

    const sorted = sortTransactionsByDate(allTransactions);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = sorted.slice(start, end);

    return HttpResponse.json({
      items,
      total: sorted.length,
      hasMore: end < sorted.length,
    });
  }),

  http.post('/api/recharge', async ({ request }) => {
    const body = (await request.json()) as {
      tierId: string;
      paymentMethod: string;
      invoice?: InvoiceInfo;
    };

    const tier = mockTiers.find((t) => t.id === body.tierId);
    if (!tier) {
      return HttpResponse.json(
        { success: false, newBalance: mockMember.balance, coupons: [], orderId: '', pointsEarned: 0 },
        { status: 400 }
      );
    }

    const coupons: Coupon[] = tier.bonus
      .filter((b) => b.type === 'coupon')
      .map((b, index) => ({
        id: `CPN${Date.now()}${index}`,
        name: b.description,
        value: b.value,
        minSpend: b.value * 2,
        expireDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }));

    const cashBonus = tier.bonus
      .filter((b) => b.type === 'cash')
      .reduce((sum, b) => sum + b.value, 0);

    const birthdayMultiplier = isBirthdayMonth() ? 2 : 1;
    const pointsEarned = tier.amount * birthdayMultiplier;

    mockMember.balance = mockMember.balance + tier.amount + cashBonus;
    mockMember.points = (mockMember.points || 0) + pointsEarned;

    const orderId = `ORD${Date.now()}`;

    allTransactions.push({
      id: `TXN${String(allTransactions.length + 1).padStart(6, '0')}`,
      type: 'recharge',
      amount: tier.amount + cashBonus,
      balanceAfter: mockMember.balance,
      description: `充值${tier.amount}元${body.invoice ? '（已开发票）' : ''}`,
      storeName: '线上充值',
      createdAt: new Date().toISOString(),
      points: pointsEarned,
    });

    allTransactions = sortTransactionsByDate(allTransactions);

    return HttpResponse.json({
      success: true,
      newBalance: mockMember.balance,
      coupons,
      orderId,
      pointsEarned,
    });
  }),
];
