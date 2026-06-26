import { Ticket, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSeatStore } from '../store/useSeatStore';
import { useNavigate } from 'react-router-dom';

export default function OrderBar() {
  const navigate = useNavigate();
  const {
    selectedSeats,
    session,
    ticketCount,
    confirmLockSeats,
    loadingLock,
    lockSuccess,
    lockMessage,
    isLocked,
    clearSelection,
    resetLockState,
  } = useSeatStore();

  const totalPrice = session ? session.price * selectedSeats.length : 0;

  const handleConfirm = async () => {
    const success = await confirmLockSeats();
    if (success) {
    }
  };

  const handleBack = () => {
    resetLockState();
    navigate('/');
  };

  const sortedSeats = [...selectedSeats].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const seatsDisplay = sortedSeats
    .map((s) => `${s.row}排${s.col}号`)
    .join('、');

  return (
    <>
      {lockMessage && (
        <div
          className={`
            fixed bottom-24 left-1/2 -translate-x-1/2 z-50
            px-5 py-3 rounded-xl flex items-center gap-2
            animate-bounce shadow-lg
            ${lockSuccess
              ? 'bg-green-900/90 text-green-300 border border-green-500/50'
              : 'bg-red-900/90 text-red-300 border border-red-500/50'
            }
          `}
        >
          {lockSuccess ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{lockMessage}</span>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-gray-900/95 backdrop-blur-xl border-t border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                {selectedSeats.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-yellow-400" />
                      <span className="text-gray-400 text-sm">已选座位：</span>
                      <span className="text-yellow-400 font-medium">
                        {seatsDisplay}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-gray-500 text-sm">
                        {selectedSeats.length} 张票 · 单价 ¥{session?.price || 0}
                      </span>
                      <span className="text-3xl font-bold text-white">
                        ¥{totalPrice}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <p>请选择 {ticketCount} 个座位</p>
                    <p className="text-sm">点击座位图上的空座进行选择</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {isLocked ? (
                  <button
                    onClick={handleBack}
                    className="
                      px-8 py-3 rounded-xl font-bold text-white
                      bg-gradient-to-r from-red-600 to-red-700
                      hover:from-red-500 hover:to-red-600
                      transition-all duration-300
                      shadow-lg shadow-red-900/30
                    "
                  >
                    返回首页
                  </button>
                ) : (
                  <>
                    <button
                      onClick={clearSelection}
                      disabled={selectedSeats.length === 0}
                      className="
                        px-6 py-3 rounded-xl font-medium text-gray-300
                        bg-gray-800 border border-gray-700
                        hover:bg-gray-700
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-300
                      "
                    >
                      清空
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={
                        loadingLock ||
                        selectedSeats.length === 0 ||
                        selectedSeats.length !== ticketCount
                      }
                      className="
                        px-8 py-3 rounded-xl font-bold text-white
                        bg-gradient-to-r from-yellow-500 to-orange-500
                        hover:from-yellow-400 hover:to-orange-400
                        disabled:from-gray-700 disabled:to-gray-700
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-300
                        shadow-lg shadow-orange-900/30
                        flex items-center gap-2
                      "
                    >
                      {loadingLock ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          锁座中...
                        </>
                      ) : (
                        <>
                          确认锁座
                          <span className="text-sm opacity-80">
                            ({selectedSeats.length}/{ticketCount})
                          </span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
