import * as XLSX from 'xlsx';
import type { PriceRecord } from '../types';

export interface ExcelRow {
  品类: string;
  摊位号: string;
  今日价格: number;
  单位?: string;
}

export function parseExcelFile(file: File): Promise<PriceRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

        const records: PriceRecord[] = jsonData.map((row, index) => {
          const icon = getCategoryIcon(row.品类);
          return {
            id: `item-${index + 1}`,
            category: row.品类,
            categoryIcon: icon,
            stallNumber: row.摊位号 || `A${String(index + 1).padStart(2, '0')}`,
            price: Number(row.今日价格) || 0,
            unit: row.单位 || '元/斤',
            yesterdayPrice: Number(row.今日价格) || 0,
            change: 0,
            history7Days: Array(7).fill(Number(row.今日价格) || 0),
            isAbnormal: false,
          };
        });

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    '白菜': '🥬',
    '猪肉': '🥩',
    '牛肉': '🥩',
    '鸡肉': '🍗',
    '鸡蛋': '🥚',
    '西红柿': '🍅',
    '黄瓜': '🥒',
    '土豆': '🥔',
    '胡萝卜': '🥕',
    '洋葱': '🧅',
    '青椒': '🫑',
    '茄子': '🍆',
    '豆角': '🫘',
    '菠菜': '🥬',
    '生菜': '🥬',
    '苹果': '🍎',
    '香蕉': '🍌',
    '橘子': '🍊',
    '西瓜': '🍉',
    '大米': '🍚',
  };
  return iconMap[category] || '📦';
}

export function generateSampleExcel(): void {
  const sampleData = [
    { '品类': '白菜', '摊位号': 'A01', '今日价格': 2.5, '单位': '元/斤' },
    { '品类': '猪肉', '摊位号': 'A03', '今日价格': 28, '单位': '元/斤' },
    { '品类': '牛肉', '摊位号': 'B02', '今日价格': 65, '单位': '元/斤' },
    { '品类': '鸡肉', '摊位号': 'B05', '今日价格': 18, '单位': '元/斤' },
    { '品类': '鸡蛋', '摊位号': 'C01', '今日价格': 6.5, '单位': '元/斤' },
    { '品类': '西红柿', '摊位号': 'C04', '今日价格': 4.5, '单位': '元/斤' },
    { '品类': '黄瓜', '摊位号': 'D02', '今日价格': 3.8, '单位': '元/斤' },
    { '品类': '土豆', '摊位号': 'D06', '今日价格': 2.8, '单位': '元/斤' },
    { '品类': '胡萝卜', '摊位号': 'E01', '今日价格': 3.2, '单位': '元/斤' },
    { '品类': '洋葱', '摊位号': 'E03', '今日价格': 2.2, '单位': '元/斤' },
    { '品类': '青椒', '摊位号': 'F02', '今日价格': 5.5, '单位': '元/斤' },
    { '品类': '茄子', '摊位号': 'F05', '今日价格': 4.8, '单位': '元/斤' },
    { '品类': '豆角', '摊位号': 'G01', '今日价格': 6.2, '单位': '元/斤' },
    { '品类': '菠菜', '摊位号': 'G04', '今日价格': 4.2, '单位': '元/斤' },
    { '品类': '生菜', '摊位号': 'H02', '今日价格': 3.5, '单位': '元/斤' },
    { '品类': '苹果', '摊位号': 'H06', '今日价格': 8.5, '单位': '元/斤' },
    { '品类': '香蕉', '摊位号': 'I01', '今日价格': 5.8, '单位': '元/斤' },
    { '品类': '橘子', '摊位号': 'I03', '今日价格': 4.5, '单位': '元/斤' },
    { '品类': '西瓜', '摊位号': 'J02', '今日价格': 3.2, '单位': '元/斤' },
    { '品类': '大米', '摊位号': 'J05', '今日价格': 3.8, '单位': '元/斤' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '价格表');
  XLSX.writeFile(workbook, '农贸市场价格模板.xlsx');
}
