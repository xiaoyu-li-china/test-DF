import { useSeatStore } from '../store/useSeatStore';

export default function TicketCountSelector() {
  const { ticketCount, setTicketCount, isLocked } = useSeatStore();
  const counts = [2, 3, 4, 5, 6];

  return (
    <div className="py-4">
      <p className="text-center text-gray-400 text-sm mb-3">选择购票数量（张）</p>
      <div className="flex justify-center gap-3">
        {counts.map((count) => (
          <button
            key={count}
            onClick={() => !isLocked && setTicketCount(count)}
            disabled={isLocked}
            className={`
              w-12 h-12 rounded-xl font-bold text-lg transition-all duration-300
              ${ticketCount === count
                ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900 shadow-lg shadow-yellow-500/30 scale-105'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:scale-105'
              }
              ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
}
