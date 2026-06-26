import type { SKUItem, Warehouse } from '../types';

const warehouses: Warehouse[] = ['A仓', 'B仓', 'C仓', 'D仓'];
const categories = ['电子产品', '服装', '食品', '日用品', '办公用品'];

const productNames = [
  '无线蓝牙耳机', '智能手表', '机械键盘', '游戏鼠标', '显示器支架',
  '笔记本电脑', '平板电脑', '移动电源', 'USB-C扩展坞', '固态硬盘',
  '纯棉T恤', '牛仔裤', '运动鞋', '羽绒服', '休闲背包',
  '矿泉水', '方便面', '坚果礼盒', '牛奶', '咖啡粉',
  '洗手液', '纸巾', '洗衣液', '垃圾袋', '保鲜膜',
  '打印纸', '签字笔', '文件夹', '订书机', '计算器'
];

function generateSKU(index: number): string {
  const prefix = ['SKU', 'PRD', 'ITM'][index % 3];
  return `${prefix}-${String(index + 1000).padStart(5, '0')}`;
}

export function generateInitialData(): SKUItem[] {
  return productNames.map((name, index) => {
    const threshold = 10 + Math.floor(Math.random() * 40);
    return {
      id: `item-${index}`,
      name,
      sku: generateSKU(index),
      warehouse: warehouses[index % warehouses.length],
      quantity: threshold + Math.floor(Math.random() * 50),
      threshold,
      category: categories[index % categories.length],
      lastUpdated: new Date().toISOString(),
    };
  });
}

export function generateRandomUpdate(items: SKUItem[]): SKUItem[] {
  const updateCount = Math.floor(Math.random() * 5) + 1;
  const indices = new Set<number>();
  
  while (indices.size < updateCount) {
    indices.add(Math.floor(Math.random() * items.length));
  }
  
  const updatedItems = items.map((item, index) => {
    if (indices.has(index)) {
      const change = Math.floor(Math.random() * 20) - 10;
      const newQuantity = Math.max(0, item.quantity + change);
      return {
        ...item,
        quantity: newQuantity,
        lastUpdated: new Date().toISOString(),
      };
    }
    return item;
  });
  
  return updatedItems;
}
