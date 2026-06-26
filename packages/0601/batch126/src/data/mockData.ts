import type { PriceRecord } from '../types';
import { ABNORMAL_THRESHOLD } from '../types';

const categories = [
  { name: '白菜', icon: '🥬', basePrice: 2.5 },
  { name: '猪肉', icon: '🥩', basePrice: 28 },
  { name: '牛肉', icon: '🥩', basePrice: 65 },
  { name: '鸡肉', icon: '🍗', basePrice: 18 },
  { name: '鸡蛋', icon: '🥚', basePrice: 6.5 },
  { name: '西红柿', icon: '🍅', basePrice: 4.5 },
  { name: '黄瓜', icon: '🥒', basePrice: 3.8 },
  { name: '土豆', icon: '🥔', basePrice: 2.8 },
  { name: '胡萝卜', icon: '🥕', basePrice: 3.2 },
  { name: '洋葱', icon: '🧅', basePrice: 2.2 },
  { name: '青椒', icon: '🫑', basePrice: 5.5 },
  { name: '茄子', icon: '🍆', basePrice: 4.8 },
  { name: '豆角', icon: '🫘', basePrice: 6.2 },
  { name: '菠菜', icon: '🥬', basePrice: 4.2 },
  { name: '生菜', icon: '🥬', basePrice: 3.5 },
  { name: '苹果', icon: '🍎', basePrice: 8.5 },
  { name: '香蕉', icon: '🍌', basePrice: 5.8 },
  { name: '橘子', icon: '🍊', basePrice: 4.5 },
  { name: '西瓜', icon: '🍉', basePrice: 3.2 },
  { name: '大米', icon: '🍚', basePrice: 3.8 },
];

const stallNumbers = ['A01', 'A03', 'B02', 'B05', 'C01', 'C04', 'D02', 'D06', 'E01', 'E03', 'F02', 'F05', 'G01', 'G04', 'H02', 'H06', 'I01', 'I03', 'J02', 'J05'];

function generatePriceHistory(basePrice: number, volatility: number = 0.2): number[] {
  const history: number[] = [];
  let currentPrice = basePrice;
  for (let i = 0; i < 7; i++) {
    const variation = (Math.random() - 0.5) * volatility * basePrice;
    currentPrice = Math.max(basePrice * 0.6, Math.min(basePrice * 1.4, currentPrice + variation));
    history.push(Math.round(currentPrice * 100) / 100);
  }
  return history;
}

export function generateMockData(marketId?: string): PriceRecord[] {
  const volatilityMap: Record<string, number> = {
    chengdong: 0.2,
    chengnan: 0.25,
    xinhua: 0.18,
  };
  const volatility = volatilityMap[marketId || ''] || 0.2;

  return categories.map((cat, index) => {
    const history = generatePriceHistory(cat.basePrice, volatility);
    const yesterdayPrice = history[5];
    const price = history[6];
    const change = ((price - yesterdayPrice) / yesterdayPrice) * 100;
    const roundedChange = Math.round(change * 100) / 100;

    return {
      id: `item-${marketId || 'default'}-${index + 1}`,
      category: cat.name,
      categoryIcon: cat.icon,
      stallNumber: stallNumbers[index],
      price: Math.round(price * 100) / 100,
      unit: '元/斤',
      yesterdayPrice: Math.round(yesterdayPrice * 100) / 100,
      change: roundedChange,
      history7Days: history,
      isAbnormal: Math.abs(roundedChange) > ABNORMAL_THRESHOLD,
    };
  });
}
