import { Guest, Table, TableTag, TABLE_TAG_CONFIG } from '../types';

interface CSVExportData {
  tables: Table[];
  guests: Guest[];
  getGuestsByTable: (tableId: string) => Guest[];
  getTableGuestCount: (tableId: string) => number;
}

const escapeCSV = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const getTagLabel = (tag: TableTag): string => {
  return TABLE_TAG_CONFIG[tag]?.label || '普通';
};

export const exportToCSV = (data: CSVExportData) => {
  const { tables, guests, getGuestsByTable, getTableGuestCount } = data;
  
  const headers = ['桌号', '桌型', '桌容量', '当前人数', '宾客姓名', '人数', '关系', '过敏信息(allergens)'];
  const rows: string[][] = [];
  
  tables
    .sort((a, b) => a.tableNumber - b.tableNumber)
    .forEach((table) => {
      const tableGuests = getGuestsByTable(table.id);
      const currentCount = getTableGuestCount(table.id);
      
      if (tableGuests.length === 0) {
        rows.push([
          String(table.tableNumber),
          getTagLabel(table.tag),
          String(table.capacity),
          String(currentCount),
          '',
          '',
          '',
          '',
        ]);
      } else {
        tableGuests.forEach((guest, idx) => {
          rows.push([
            idx === 0 ? String(table.tableNumber) : '',
            idx === 0 ? getTagLabel(table.tag) : '',
            idx === 0 ? String(table.capacity) : '',
            idx === 0 ? String(currentCount) : '',
            escapeCSV(guest.name),
            String(guest.count),
            escapeCSV(guest.relationship),
            escapeCSV(guest.allergens),
          ]);
        });
      }
    });
  
  const unassigned = guests.filter((g) => g.tableId === null);
  if (unassigned.length > 0) {
    rows.push(['未安排', '', '', '', '', '', '', '']);
    unassigned.forEach((guest) => {
      rows.push([
        '',
        '',
        '',
        '',
        escapeCSV(guest.name),
        String(guest.count),
        escapeCSV(guest.relationship),
        escapeCSV(guest.allergens),
      ]);
    });
  }
  
  const bom = '\uFEFF';
  const csvContent = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `婚宴排桌方案_酒店.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
