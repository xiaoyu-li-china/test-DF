const { calculateDaysRemaining, getCardStatus, isOverdue, formatDate } = require('./plantUtils');

describe('plantUtils', () => {
  describe('日期差计算 & overdue 判定', () => {
    const TODAY = new Date('2026-06-02');

    test('今天刚浇水 → 剩余天数 = 周期 - 0', () => {
      const plant = {
        lastWatered: '2026-06-02',
        waterCycle: 7
      };
      expect(calculateDaysRemaining(plant, new Date(TODAY))).toBe(7);
      expect(isOverdue(plant, new Date(TODAY))).toBe(false);
    });

    test('昨天该浇（已逾期 1 天）', () => {
      const plant = {
        lastWatered: '2026-06-01',
        waterCycle: 1
      };
      expect(calculateDaysRemaining(plant, new Date(TODAY))).toBe(0);
      expect(getCardStatus(0)).toBe('urgent');
    });

    test('周期为 1 天，3 天前浇的 → 逾期 2 天', () => {
      const plant = {
        lastWatered: '2026-05-30',
        waterCycle: 1
      };
      expect(calculateDaysRemaining(plant, new Date(TODAY))).toBe(-2);
      expect(isOverdue(plant, new Date(TODAY))).toBe(true);
      expect(getCardStatus(-2)).toBe('overdue');
    });

    test('周期 7 天，3 天前浇的 → 还剩 4 天（normal）', () => {
      const plant = {
        lastWatered: '2026-05-30',
        waterCycle: 7
      };
      expect(calculateDaysRemaining(plant, new Date(TODAY))).toBe(4);
      expect(getCardStatus(4)).toBe('normal');
    });

    test('还剩 2 天 → urgent', () => {
      expect(getCardStatus(2)).toBe('urgent');
      expect(getCardStatus(1)).toBe('urgent');
      expect(getCardStatus(0)).toBe('urgent');
    });

    test('逾期任意天 → overdue', () => {
      expect(getCardStatus(-1)).toBe('overdue');
      expect(getCardStatus(-100)).toBe('overdue');
    });

    test('还剩 3 天 → normal（临界值）', () => {
      expect(getCardStatus(3)).toBe('normal');
    });
  });

  describe('formatDate', () => {
    test('格式化日期为 YYYY-MM-DD', () => {
      const date = new Date('2026-06-02T12:34:56');
      expect(formatDate(date)).toBe('2026-06-02');
    });

    test('月份和日期补零', () => {
      const date = new Date('2026-01-05T00:00:00');
      expect(formatDate(date)).toBe('2026-01-05');
    });
  });
});

describe('localStorage mock 测试', () => {
  beforeEach(() => {
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('savePlants 正确序列化并调用 setItem', () => {
    const STORAGE_KEY = 'test_plants';
    const plants = [{ id: 1, name: '绿萝', lastWatered: '2026-06-01', waterCycle: 7 }];

    localStorage.getItem.mockReturnValue(JSON.stringify(plants));
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY));

    expect(localStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(loaded).toEqual(plants);
  });

  test('localStorage 为空时返回空数组', () => {
    localStorage.getItem.mockReturnValue(null);
    const raw = localStorage.getItem('nonexistent');
    const plants = raw ? JSON.parse(raw) : [];
    expect(plants).toEqual([]);
  });

  test('ID 计数器递增', () => {
    const COUNTER_KEY = 'test_id_counter';
    let counter = 0;

    localStorage.getItem.mockImplementation(key => {
      if (key === COUNTER_KEY) return String(counter);
      return null;
    });
    localStorage.setItem.mockImplementation((key, val) => {
      if (key === COUNTER_KEY) counter = parseInt(val);
    });

    function nextId() {
      let c = parseInt(localStorage.getItem(COUNTER_KEY)) || 0;
      c++;
      localStorage.setItem(COUNTER_KEY, String(c));
      return c;
    }

    expect(nextId()).toBe(1);
    expect(nextId()).toBe(2);
    expect(nextId()).toBe(3);
    expect(localStorage.setItem).toHaveBeenCalledTimes(3);
  });
});
