import type {
  MemberInfo,
  RechargeTier,
  Transaction,
  TransactionResponse,
  RechargeResponse,
  Coupon,
  InvoiceInfo,
} from '@/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      ? [100, 200, 500][Math.floor(Math.random() * 3)]
      : Math.round((Math.random() * 80 + 10) * 100) / 100;

    const daysAgo = i * (0.5 + Math.random() * 0.5);

    transactions.push({
      id: `TXN${String(i + 1).padStart(6, '0')}`,
      type: isRecharge ? 'recharge' : 'consume',
      amount: isRecharge ? amount : -amount,
      balanceAfter: Math.round((500 + Math.random() * 500) * 100) / 100,
      description: isRecharge ? '账户充值' : consumeDescriptions[Math.floor(Math.random() * consumeDescriptions.length)],
      storeName: stores[Math.floor(Math.random() * stores.length)],
      createdAt: new Date(baseTime - daysAgo * 86400000).toISOString(),
    });
  }

  return sortTransactionsByDate(transactions);
};

const allTransactions = generateTransactions();

export const getMemberInfo = async (): Promise<MemberInfo> => {
  await delay(600);
  return { ...mockMember };
};

export const getRechargeTiers = async (): Promise<RechargeTier[]> => {
  await delay(400);
  return [...mockTiers];
};

export const getTransactions = async (
  page: number = 1,
  pageSize: number = 10
): Promise<TransactionResponse> => {
  await delay(500);
  const sorted = sortTransactionsByDate(allTransactions);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = sorted.slice(start, end);
  return {
    items,
    total: sorted.length,
    hasMore: end < sorted.length,
  };
};

const isBirthdayMonth = (): boolean => {
  const birthday = new Date(mockMember.birthday);
  const now = new Date();
  return birthday.getMonth() === now.getMonth();
};

export const recharge = async (
  tierId: string,
  paymentMethod: string = 'wechat',
  invoice?: InvoiceInfo
): Promise<RechargeResponse> => {
  await delay(1000);

  const tier = mockTiers.find((t) => t.id === tierId);
  if (!tier) {
    return { success: false, newBalance: mockMember.balance, coupons: [], orderId: '', pointsEarned: 0 };
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
    description: `充值${tier.amount}元${invoice ? '（已开发票）' : ''}`,
    storeName: '线上充值',
    createdAt: new Date().toISOString(),
    points: pointsEarned,
  });

  allTransactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (invoice) {
    console.log('📄 发票信息已记录:', invoice);
  }

  return {
    success: true,
    newBalance: mockMember.balance,
    coupons,
    orderId,
    pointsEarned,
  };
};
