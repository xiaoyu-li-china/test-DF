import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Guest, Table, TableTag, TABLE_TAG_CONFIG } from '../types';

interface ExportData {
  tables: Table[];
  getGuestsByTable: (tableId: string) => Guest[];
  getTableGuestCount: (tableId: string) => number;
  totalGuests: number;
  eventName?: string;
  date?: string;
}

const getTagLabel = (tag: TableTag): string => TABLE_TAG_CONFIG[tag]?.label || '';

export const exportToPDF = async (data: ExportData) => {
  const { tables, getGuestsByTable, getTableGuestCount, totalGuests, eventName = '婚宴排桌方案', date } = data;
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '750px';
  container.style.background = '#FFF8F0';
  container.style.padding = '40px';
  container.style.fontFamily = '"Noto Sans SC", sans-serif';
  document.body.appendChild(container);
  
  let html = `
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="font-size: 32px; color: #3D2B1F; margin: 0; font-family: 'Playfair Display', serif; font-weight: 600;">${eventName}</h1>
      ${date ? `<p style="color: #7D6652; margin-top: 10px; font-size: 16px;">${date}</p>` : ''}
      <p style="color: #C9A96E; margin-top: 16px; font-size: 14px;">宾客总数：${totalGuests} 人 | 共 ${tables.length} 桌</p>
    </div>
  `;

  const sortedTables = [...tables].sort((a, b) => a.tableNumber - b.tableNumber);
  
  sortedTables.forEach((table) => {
    const guests = getGuestsByTable(table.id);
    const count = getTableGuestCount(table.id);
    const isOver = count > table.capacity;
    const tagLabel = getTagLabel(table.tag);
    const tagColor = TABLE_TAG_CONFIG[table.tag]?.color || table.color;
    
    html += `
      <div style="
        margin-bottom: 24px;
        padding: 18px;
        background: #FFF;
        border-radius: 12px;
        border: 2px solid ${isOver ? '#EF4444' : table.color};
        page-break-inside: avoid;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <h2 style="font-size: 18px; color: #3D2B1F; margin: 0; font-weight: 600;">第 ${table.tableNumber} 桌</h2>
            ${tagLabel ? `
              <span style="
                display: inline-flex;
                align-items: center;
                padding: 3px 10px;
                background: ${tagColor};
                color: #FFF;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
              ">${tagLabel}</span>
            ` : ''}
          </div>
          <span style="
            font-size: 14px;
            color: ${isOver ? '#EF4444' : '#7D6652'};
            font-weight: 600;
          ">
            ${count} / ${table.capacity} 人
          </span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
    `;
    
    if (guests.length === 0) {
      html += `<span style="color: #B8A695; font-size: 13px;">暂无宾客</span>`;
    } else {
      guests.sort((a, b) => a.name.localeCompare(b.name)).forEach((guest) => {
        html += `
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 10px;
            background: #FFF8F0;
            border: 1px solid #E8D4B8;
            border-radius: 16px;
            font-size: 12px;
            color: #3D2B1F;
            white-space: nowrap;
          ">
            ${guest.name}
            <span style="color: #C9A96E; font-weight: 600;">(${guest.count}人)</span>
            ${guest.allergens ? `
              <span style="color: #F59E0B; font-size: 10px; font-weight: 500;">⚠️${guest.allergens}</span>
            ` : ''}
          </span>
        `;
      });
    }
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += `
    <div style="
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E8D4B8;
      text-align: center;
      color: #B8A695;
      font-size: 11px;
    ">
      导出时间：${new Date().toLocaleString('zh-CN')}
    </div>
  `;
  
  container.innerHTML = html;
  
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFF8F0',
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const imgScaledHeight = imgHeight * ratio;
    
    let heightLeft = imgScaledHeight;
    let position = 0;
    let pageNum = 1;
    const totalPages = Math.ceil(imgScaledHeight / pdfHeight);
    
    const addFooter = (page: number) => {
      pdf.setFontSize(9);
      pdf.setTextColor(120, 102, 82);
      pdf.text(
        `第 ${page} 页 / 共 ${totalPages} 页`,
        pdfWidth / 2,
        pdfHeight - 10,
        { align: 'center' }
      );
    };
    
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgScaledHeight);
    addFooter(pageNum);
    heightLeft -= pdfHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgScaledHeight;
      pdf.addPage();
      pageNum++;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgScaledHeight);
      addFooter(pageNum);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(`${eventName}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};
