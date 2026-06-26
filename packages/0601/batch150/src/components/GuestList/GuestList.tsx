import React, { useState, useMemo } from 'react';
import { Search, Users, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { GuestItem } from './GuestItem';
import { useAppStore } from '../../store/useAppStore';
import { RelationshipGroup, TableTag, TABLE_TAG_CONFIG } from '../../types';

export const GuestList: React.FC = () => {
  const guests = useAppStore((state) => state.guests);
  const getUnassignedGuests = useAppStore((state) => state.getUnassignedGuests);
  const getSuggestions = useAppStore((state) => state.getSuggestions);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const unassignedGuests = getUnassignedGuests();
  const suggestions = getSuggestions();
  const suggestionMap = useMemo(() => {
    const map: Record<string, string> = {};
    suggestions.forEach((s) => {
      const tagLabel = TABLE_TAG_CONFIG[s.suggestedTableTag]?.label || '';
      map[s.guestId] = `💡 建议第${s.suggestedTableNumber}桌${tagLabel ? `(${tagLabel})` : ''}`;
    });
    return map;
  }, [suggestions]);

  const filteredGuests = useMemo(() => {
    if (!searchTerm.trim()) return unassignedGuests;
    const term = searchTerm.toLowerCase();
    return unassignedGuests.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.relationship.toLowerCase().includes(term)
    );
  }, [unassignedGuests, searchTerm]);

  const groupedGuests = useMemo(() => {
    const groups: RelationshipGroup = {};
    filteredGuests.forEach((guest) => {
      const rel = guest.relationship || '其他';
      if (!groups[rel]) {
        groups[rel] = [];
      }
      groups[rel].push(guest);
    });
    return groups;
  }, [filteredGuests]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const totalCount = unassignedGuests.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="h-full flex flex-col bg-champagne-50 rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-champagne-200">
        <h2 className="text-lg font-display font-semibold text-espresso-800 mb-3">
          宾客列表
        </h2>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-400"
            />
            <input
              type="text"
              placeholder="搜索宾客姓名或关系..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="
                w-full pl-9 pr-4 py-2
                bg-white border border-champagne-200 rounded-lg
                text-sm text-espresso-700 placeholder-espresso-400
                focus:outline-none focus:border-champagne-500 focus:ring-1 focus:ring-champagne-500
                transition-colors
              "
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-espresso-500">
          <span className="flex items-center gap-1">
            <Users size={14} />
            未排 {unassignedGuests.length} 组，共 {totalCount} 人
          </span>
          {suggestions.length > 0 && (
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`
                flex items-center gap-1 px-2 py-0.5 rounded-full
                text-xs font-medium transition-colors
                ${showSuggestions
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-champagne-200 text-champagne-700 hover:bg-champagne-300'
                }
              `}
            >
              <Lightbulb size={12} />
              {suggestions.length} 条建议
            </button>
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="p-3 border-b border-champagne-200 bg-blue-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-blue-700">智能分桌建议</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {suggestions.map((s) => (
              <div
                key={s.guestId}
                className="flex items-start gap-2 text-xs bg-white rounded-lg p-2 border border-blue-100"
              >
                <span className="font-medium text-espresso-700">{s.guestName}</span>
                <span className="text-blue-500">→</span>
                <span className="text-blue-700 font-medium">
                  第{s.suggestedTableNumber}桌
                  {s.suggestedTableTag !== 'normal' && `(${TABLE_TAG_CONFIG[s.suggestedTableTag].label})`}
                </span>
                <span className="text-espresso-400 flex-1 text-right">{s.reason}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-espresso-400 mt-2">💡 建议仅供参考，拖拽宾客到目标桌即可排座</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {unassignedGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-espresso-400">
            <Users size={48} className="mb-3 opacity-50" />
            <p className="text-sm">暂无宾客</p>
            <p className="text-xs mt-1">请导入 Excel 文件或手动添加</p>
          </div>
        ) : Object.keys(groupedGuests).length === 0 ? (
          <div className="text-center text-espresso-400 py-8">
            <p className="text-sm">未找到匹配的宾客</p>
          </div>
        ) : (
          Object.entries(groupedGuests).map(([relationship, guestsList]) => (
            <div key={relationship} className="mb-4">
              <button
                onClick={() => toggleGroup(relationship)}
                className="
                  w-full flex items-center justify-between
                  py-2 px-1
                  text-sm font-medium text-espresso-700
                  hover:text-espresso-900
                  transition-colors
                "
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getRelationshipColor(relationship) }}
                  />
                  <span>{relationship}</span>
                  <span className="text-xs text-espresso-400">
                    ({guestsList.length}组)
                  </span>
                </div>
                {expandedGroups[relationship] !== false ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {expandedGroups[relationship] !== false && (
                <div className="mt-2 animate-fade-in">
                  {guestsList.map((guest) => (
                    <GuestItem
                      key={guest.id}
                      guest={guest}
                      suggestion={suggestionMap[guest.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const getRelationshipColor = (relationship: string): string => {
  const colors: Record<string, string> = {
    '男方亲友': '#C9A96E',
    '女方亲友': '#E8A0BF',
    '同事': '#A07E54',
    '同学': '#7D6652',
    '朋友': '#DB6B97',
    '其他': '#B8A695',
  };
  return colors[relationship] || '#B8A695';
};
