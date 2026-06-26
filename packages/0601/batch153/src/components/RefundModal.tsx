import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useSeatStore } from '../store/useSeatStore';
import { getAllSessions } from '../mock/data';

export default function RefundModal() {
  const {
    showRefundModal,
    refundOrderId,
    lockedOrders,
    confirmRefund,
    cancelRefund,
  } = useSeatStore();

  if (!showRefundModal || !refundOrderId) return null;

  const order = lockedOrders.find((o) => o.orderId === refundOrderId);
  if (!order) return null;

  const session = getAllSessions().find((s) => s.id === order.sessionId);
  const refundAmount = session ? order.totalPrice * 0.8 : 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={cancelRefund}
      />
      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full shadow-2xl animate-fade-in-up">
        <button
          onClick={cancelRefund}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">退票确认</h3>
            <p className="text-sm text-gray-400">开场前1小时可退80%票款</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">订单号</span>
            <span className="text-white font-mono">{order.orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">场次</span>
            <span className="text-white">
              {session ? `${session.date} ${session.time} ${session.hall}` : '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">票数</span>
            <span className="text-white">{order.seatIds.length} 张</span>
          </div>
          <div className="border-t border-gray-800 pt-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">原价</span>
              <span className="text-white">¥{order.totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">扣除（20%）</span>
              <span className="text-red-400">-¥{(order.totalPrice * 0.2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-300">退还金额</span>
              <span className="text-yellow-400">¥{refundAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-3 mb-6">
          <p className="text-sm text-red-300">
            ⚠️ 退票后座位将释放给其他用户，此操作不可撤销
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={cancelRefund}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all"
          >
            取消
          </button>
          <button
            onClick={confirmRefund}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all shadow-lg shadow-red-900/30"
          >
            确认退票
          </button>
        </div>
      </div>
    </div>
  );
}
