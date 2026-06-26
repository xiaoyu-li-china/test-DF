import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CirclePlus,
  FileDown,
  Trash2,
  Sparkles,
  Crown,
  Baby,
  Table2,
  Users,
  ChevronDown,
} from 'lucide-react';
import { ExcelImport } from './ExcelImport';
import { useAppStore } from '../../store/useAppStore';
import { exportToPDF } from '../../utils/pdfExport';
import { exportToCSV } from '../../utils/csvExport';
import { TableTag, TABLE_TAG_CONFIG } from '../../types';
import { mockGuests120, totalPeopleCount } from '../../mock/fixture';

export const Toolbar: React.FC = () => {
  const [showImport, setShowImport] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const [newTableCapacity, setNewTableCapacity] = useState('10');
  const [newTableTag, setNewTableTag] = useState<TableTag>('normal');
  const addTable = useAppStore((state) => state.addTable);
  const clearAll = useAppStore((state) => state.clearAll);
  const tables = useAppStore((state) => state.tables);
  const guests = useAppStore((state) => state.guests);
  const getGuestsByTable = useAppStore((state) => state.getGuestsByTable);
  const getTableGuestCount = useAppStore((state) => state.getTableGuestCount);
  const getTotalGuests = useAppStore((state) => state.getTotalGuests);

  const handleAddTable = () => {
    const capacity = parseInt(newTableCapacity) || 10;
    addTable(capacity, newTableTag);
    setShowAddTable(false);
    setNewTableCapacity('10');
    setNewTableTag('normal');
  };

  const handleExportPDF = async () => {
    if (tables.length === 0) {
      alert('请先添加桌子');
      return;
    }
    await exportToPDF({
      tables,
      getGuestsByTable,
      getTableGuestCount,
      totalGuests: getTotalGuests(),
      eventName: '婚宴排桌方案',
    });
  };

  const handleExportCSV = () => {
    if (tables.length === 0 && guests.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    exportToCSV({
      tables,
      guests,
      getGuestsByTable,
      getTableGuestCount,
    });
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
      clearAll();
    }
  };

  const loadSmallDemo = () => {
    const { importGuests } = useAppStore.getState();
    importGuests([
      { name: '张伟一家', count: 3, relationship: '男方亲友', allergens: '' },
      { name: '李明', count: 2, relationship: '男方亲友', allergens: '花生' },
      { name: '王芳', count: 1, relationship: '女方亲友', allergens: '' },
      { name: '刘洋一家', count: 4, relationship: '女方亲友', allergens: '海鲜' },
      { name: '陈强', count: 2, relationship: '同事', allergens: '' },
      { name: '赵雪', count: 1, relationship: '同事', allergens: '' },
      { name: '孙磊', count: 2, relationship: '同学', allergens: '' },
      { name: '周婷一家', count: 3, relationship: '朋友', allergens: '芒果' },
      { name: '小宝', count: 1, relationship: '儿童', allergens: '坚果' },
      { name: '豆豆', count: 1, relationship: '儿童', allergens: '' },
      { name: '男方父亲', count: 2, relationship: '男方父母', allergens: '' },
      { name: '女方母亲', count: 2, relationship: '女方父母', allergens: '' },
    ]);

    addTable(12, 'main');
    addTable(8, 'kids');
    for (let i = 0; i < 3; i++) {
      addTable(10, 'normal');
    }
    setShowDemoDropdown(false);
  };

  const load120GuestsFixture = () => {
    const { importGuests } = useAppStore.getState();
    importGuests(mockGuests120);

    addTable(12, 'main');
    addTable(10, 'kids');
    for (let i = 0; i < 12; i++) {
      addTable(10, 'normal');
    }
    setShowDemoDropdown(false);
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-champagne-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-champagne-500 rounded-xl">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-espresso-800">
              婚宴排桌助手
            </h1>
            <p className="text-xs text-espresso-500">
              拖拽宾客到圆桌，轻松完成排座
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowDemoDropdown(!showDemoDropdown)}
              className="
                flex items-center gap-2 px-4 py-2 rounded-full
                border border-champagne-300
                text-espresso-600 hover:bg-champagne-50
                text-sm font-medium
                transition-colors
              "
            >
              <Sparkles size={16} />
              加载示例
              <ChevronDown size={14} />
            </button>

            {showDemoDropdown && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-champagne-200 p-2 min-w-[200px] animate-fade-in">
                <button
                  onClick={loadSmallDemo}
                  className="
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    text-left text-sm hover:bg-champagne-50 transition-colors
                  "
                >
                  <Users size={16} className="text-champagne-600" />
                  <div>
                    <p className="font-medium text-espresso-700">小型示例</p>
                    <p className="text-xs text-espresso-400">12 组宾客，快速体验</p>
                  </div>
                </button>
                <button
                  onClick={load120GuestsFixture}
                  className="
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    text-left text-sm hover:bg-champagne-50 transition-colors
                  "
                >
                  <Users size={16} className="text-rose-500" />
                  <div>
                    <p className="font-medium text-espresso-700">120+ 人测试</p>
                    <p className="text-xs text-espresso-400">共 {mockGuests120.length} 组，{totalPeopleCount} 人</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowImport(true)}
            className="
              flex items-center gap-2 px-4 py-2 rounded-full
              bg-champagne-500 text-white
              text-sm font-medium
              hover:bg-champagne-600
              transition-colors
              shadow-md hover:shadow-lg
            "
          >
            <FileSpreadsheet size={16} />
            导入 Excel
          </button>

          <div className="relative">
            <button
              onClick={() => setShowAddTable(!showAddTable)}
              className="
                flex items-center gap-2 px-4 py-2 rounded-full
                bg-espresso-700 text-white
                text-sm font-medium
                hover:bg-espresso-800
                transition-colors
                shadow-md hover:shadow-lg
              "
            >
              <CirclePlus size={16} />
              添加圆桌
            </button>

            {showAddTable && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-champagne-200 p-4 min-w-[240px] animate-fade-in">
                <p className="text-sm font-medium text-espresso-700 mb-3">选择桌型</p>
                <div className="flex gap-2 mb-3">
                  {(['main', 'kids', 'normal'] as TableTag[]).map((tag) => {
                    const cfg = TABLE_TAG_CONFIG[tag];
                    const icons = { main: <Crown size={14} />, kids: <Baby size={14} />, normal: <Table2 size={14} /> };
                    return (
                      <button
                        key={tag}
                        onClick={() => setNewTableTag(tag)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                          border transition-all
                          ${newTableTag === tag
                            ? 'text-white shadow-sm'
                            : 'text-espresso-600 border-champagne-200 hover:border-champagne-400'
                          }
                        `}
                        style={newTableTag === tag ? {
                          backgroundColor: cfg.color,
                          borderColor: cfg.color,
                        } : undefined}
                      >
                        {icons[tag]}
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm font-medium text-espresso-700 mb-2">容量</p>
                <input
                  type="number"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  className="
                    w-full px-3 py-2 mb-3
                    border border-champagne-300 rounded-lg
                    text-sm text-espresso-700
                    focus:outline-none focus:border-champagne-500
                  "
                  min="1"
                />
                <button
                  onClick={handleAddTable}
                  className="
                    w-full py-2 rounded-lg
                    bg-champagne-500 text-white text-sm font-medium
                    hover:bg-champagne-600 transition-colors
                  "
                >
                  确认添加
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleExportPDF}
            className="
              flex items-center gap-2 px-4 py-2 rounded-full
              bg-rose-500 text-white
              text-sm font-medium
              hover:bg-rose-600
              transition-colors
              shadow-md hover:shadow-lg
            "
            title="导出 PDF（含排版）"
          >
            <FileDown size={16} />
            导出 PDF
          </button>

          <button
            onClick={handleExportCSV}
            className="
              flex items-center gap-2 px-4 py-2 rounded-full
              border border-champagne-400
              text-champagne-700
              text-sm font-medium
              hover:bg-champagne-50
              transition-colors
            "
            title="导出 CSV 给酒店（含过敏信息）"
          >
            <Table2 size={16} />
            导出 CSV
          </button>

          {guests.length > 0 && (
            <button
              onClick={handleClearAll}
              className="
                flex items-center gap-2 px-4 py-2 rounded-full
                border border-espresso-300
                text-espresso-500 hover:text-red-500 hover:border-red-300 hover:bg-red-50
                text-sm font-medium
                transition-colors
              "
            >
              <Trash2 size={16} />
              清空
            </button>
          )}
        </div>
      </div>

      {showImport && <ExcelImport onClose={() => setShowImport(false)} />}
    </>
  );
};
