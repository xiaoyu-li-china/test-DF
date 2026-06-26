export default function SeatLegend() {
  const legends = [
    { color: '#3D3D5C', label: '空座' },
    { color: '#FFD700', label: '已选' },
    { color: '#0F0F1A', label: '已售' },
    { color: '#E50914', label: '锁座' },
    { color: 'rgba(255, 215, 0, 0.3)', label: '推荐' },
    { color: '#5C2D5C', label: '情侣座', icon: 'heart' },
    { color: '#2D4A5C', label: '残疾人座', icon: 'wheelchair' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4 py-4">
      {legends.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className="relative">
            <div
              className="w-5 h-5 rounded-md border border-gray-600"
              style={{ backgroundColor: item.color }}
            />
            {item.icon === 'heart' && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-pink-400">♥</span>
            )}
            {item.icon === 'wheelchair' && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-blue-400">♿</span>
            )}
          </div>
          <span className="text-sm text-gray-300">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
