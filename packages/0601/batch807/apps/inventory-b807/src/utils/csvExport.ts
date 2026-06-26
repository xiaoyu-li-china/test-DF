import type { SKUItem } from '../types';

export interface ExportResult {
  successIds: string[];
  failedIds: string[];
}

export function convertToCSV(items: SKUItem[]): string {
  const headers = [
    'SKU',
    '商品名称',
    '仓库',
    '分类',
    '库存数量',
    '预警阈值',
    '最后更新时间',
  ];

  const rows = items.map((item) => [
    item.sku,
    item.name,
    item.warehouse,
    item.category,
    item.quantity.toString(),
    item.threshold.toString(),
    item.lastUpdated,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToCSV(
  items: SKUItem[],
  warehouseFilter?: string
): Promise<ExportResult> {
  const filteredItems = warehouseFilter
    ? items.filter((item) => item.warehouse === warehouseFilter)
    : items;

  if (filteredItems.length === 0) {
    return { successIds: [], failedIds: [] };
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const shouldFail = Math.random() < 0.3;

      if (shouldFail) {
        const failCount = Math.ceil(filteredItems.length * 0.3);
        const failIndices = new Set<number>();
        while (failIndices.size < failCount) {
          failIndices.add(Math.floor(Math.random() * filteredItems.length));
        }

        const successIds: string[] = [];
        const failedIds: string[] = [];

        filteredItems.forEach((item, index) => {
          if (failIndices.has(index)) {
            failedIds.push(item.id);
          } else {
            successIds.push(item.id);
          }
        });

        const successItems = filteredItems.filter((item) =>
          successIds.includes(item.id)
        );

        if (successItems.length > 0) {
          const csvContent = convertToCSV(successItems);
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, 19);
          const warehouseSuffix = warehouseFilter ? `_${warehouseFilter}` : '';
          downloadCSV(csvContent, `库存数据${warehouseSuffix}_${timestamp}.csv`);
        }

        resolve({ successIds, failedIds });
      } else {
        const csvContent = convertToCSV(filteredItems);
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const warehouseSuffix = warehouseFilter ? `_${warehouseFilter}` : '';
        downloadCSV(csvContent, `库存数据${warehouseSuffix}_${timestamp}.csv`);

        resolve({
          successIds: filteredItems.map((item) => item.id),
          failedIds: [],
        });
      }
    }, 800);
  });
}
