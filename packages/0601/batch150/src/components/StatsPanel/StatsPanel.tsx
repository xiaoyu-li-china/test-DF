import React from 'react';
import { Users, Table, CheckCircle2, AlertTriangle, BarChart3, Crown, Baby, Copy, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TABLE_TAG_CONFIG } from '../../types';

export const StatsPanel: React.FC = () => {
  const guests = useAppStore((state) => state.guests);
  const tables = useAppStore((state) => state.tables);
  const getTotalGuests = useAppStore((state) => state.getTotalGuests);
  const getAssignedGuestsCount = useAppStore((state) => state.getAssignedGuestsCount);
  const getTableGuestCount = useAppStore((state) => state.getTableGuestCount);
  const isTableOverCapacity = useAppStore((state) => state.isTableOverCapacity);
  const detectDuplicates = useAppStore((state) => state.detectDuplicates);
  const removeGuest = useAppStore((state) => state.removeGuest);

  const totalGuests = getTotalGuests();
  const assignedGuests = getAssignedGuestsCount();
  const unassignedGuests = totalGuests - assignedGuests;
  const overCapacityTables = tables.filter((t) => isTableOverCapacity(t.id)).length;
  const progress = totalGuests > 0 ? (assignedGuests / totalGuests) * 100 : 0;
  const duplicates = detectDuplicates();

  const allergenGuests = guests.filter((g) => g.allergens && g.allergens.trim() !== '');
  const mainTables = tables.filter((t) => t.tag === 'main');
  const kidsTables = tables.filter((t) => t.tag === 'kids');

  return (
    <div className="h-full flex flex-col bg-champagne-50 rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-champagne-200">
        <h2 className="text-lg font-display font-semibold text-espresso-800 mb-1">
          统计概览
        </h2>
        <p className="text-xs text-espresso-500">实时查看排桌进度</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-champagne-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-champagne-100 rounded-lg">
                <Users size={16} className="text-champagne-600" />
              </div>
              <span className="text-xs text-espresso-500">总宾客</span>
            </div>
            <p className="text-2xl font-bold text-espresso-800">{totalGuests}</p>
            <p className="text-xs text-espresso-400 mt-1">{guests.length} 组</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-champagne-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-champagne-100 rounded-lg">
                <Table size={16} className="text-champagne-600" />
              </div>
              <span className="text-xs text-espresso-500">总桌数</span>
            </div>
            <p className="text-2xl font-bold text-espresso-800">{tables.length}</p>
            <div className="flex gap-1 mt-1">
              {mainTables.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: TABLE_TAG_CONFIG.main.color }}>
                  👑 {mainTables.length}
                </span>
              )}
              {kidsTables.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: TABLE_TAG_CONFIG.kids.color }}>
                  👶 {kidsTables.length}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-champagne-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-sm font-medium text-espresso-700">排桌进度</span>
            </div>
            <span className="text-sm font-semibold text-champagne-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-champagne-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-champagne-400 to-champagne-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-espresso-500">
            <span>已排 {assignedGuests} 人</span>
            <span>未排 {unassignedGuests} 人</span>
          </div>
        </div>

        {allergenGuests.length > 0 && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="text-sm font-medium text-amber-700">过敏提醒</span>
            </div>
            <div className="space-y-1">
              {allergenGuests.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-xs">
                  <span className="text-espresso-700">{g.name}</span>
                  <span className="text-amber-600 font-medium">{g.allergens}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Copy size={16} className="text-orange-500" />
              <span className="text-sm font-medium text-orange-700">重复宾客检测</span>
            </div>
            <p className="text-xs text-orange-600 mb-2">发现 {duplicates.length} 个重名宾客</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {duplicates.map((dup) => (
                <div
                  key={dup.name}
                  className="flex items-center justify-between text-xs bg-white rounded-lg p-2 border border-orange-100"
                >
                  <div>
                    <span className="text-espresso-700 font-medium">{dup.name}</span>
                    <span className="text-orange-500 ml-1">x{dup.count}</span>
                  </div>
                  <button
                    onClick={() => dup.ids.slice(1).forEach((id) => removeGuest(id))}
                    className="flex items-center gap-1 text-xs text-orange-600 hover:text-red-500 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
                  >
                    <Trash2 size={12} />
                    保留1条
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {overCapacityTables > 0 && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="text-sm font-medium text-red-700">容量超限提醒</span>
            </div>
            <p className="text-xs text-red-600">
              有 {overCapacityTables} 桌人数超过设定容量，请及时调整
            </p>
          </div>
        )}

        {tables.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-champagne-100">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-champagne-600" />
              <span className="text-sm font-medium text-espresso-700">每桌人数</span>
            </div>
            <div className="space-y-3">
              {tables.map((table) => {
                const count = getTableGuestCount(table.id);
                const isOver = isTableOverCapacity(table.id);
                const percentage = (count / table.capacity) * 100;
                const tagCfg = TABLE_TAG_CONFIG[table.tag];

                return (
                  <div key={table.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-espresso-600 flex items-center gap-1">
                        第 {table.tableNumber} 桌
                        {table.tag !== 'normal' && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-white"
                            style={{ backgroundColor: tagCfg.color, fontSize: '10px' }}
                          >
                            {table.tag === 'main' ? '👑' : '👶'}
                            {tagCfg.label}
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isOver ? 'text-red-500' : 'text-espresso-500'
                        }`}
                      >
                        {count}/{table.capacity}
                      </span>
                    </div>
                    <div className="h-1.5 bg-espresso-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-red-500' : 'bg-champagne-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tables.length === 0 && (
          <div className="text-center py-8 text-espresso-400">
            <Table size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">添加桌子后显示统计</p>
          </div>
        )}
      </div>
    </div>
  );
};
