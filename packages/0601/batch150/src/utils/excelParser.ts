import * as XLSX from 'xlsx';

export interface ExcelGuest {
  name: string;
  count: number;
  relationship: string;
  allergens: string;
}

export const parseExcelFile = async (file: File): Promise<ExcelGuest[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        const guests: ExcelGuest[] = jsonData.map((row: any) => {
          const name = row['姓名'] || row['name'] || row['宾客姓名'] || '';
          const count = parseInt(row['人数'] || row['count'] || row['人数（含本人）'] || '1');
          const relationship = row['关系'] || row['relationship'] || row['与新人关系'] || '其他';
          const allergens = row['过敏信息'] || row['allergens'] || row['忌口'] || row['过敏'] || '';
          
          return {
            name: String(name),
            count: isNaN(count) ? 1 : Math.max(1, count),
            relationship: String(relationship),
            allergens: String(allergens),
          };
        }).filter((g) => g.name.trim() !== '');
        
        resolve(guests);
      } catch (error) {
        reject(new Error('Excel 文件解析失败，请检查文件格式'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsBinaryString(file);
  });
};

export const downloadTemplate = () => {
  const templateData = [
    { '姓名': '张三', '人数': 2, '关系': '男方亲友', '过敏信息': '' },
    { '姓名': '李四', '人数': 1, '关系': '女方亲友', '过敏信息': '花生' },
    { '姓名': '王五一家', '人数': 3, '关系': '同事', '过敏信息': '海鲜' },
  ];
  
  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '宾客名单');
  XLSX.writeFile(wb, '宾客名单模板.xlsx');
};
