import { CheckCircle, X, Gift, Sparkles } from 'lucide-react';
import { useMemberStore } from '@/hooks/useMemberStore';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function SuccessModal() {
  const { showSuccessModal, setShowSuccessModal, lastRechargeResult } = useMemberStore();

  if (!showSuccessModal || !lastRechargeResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowSuccessModal(false)}
      />
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 animate-fade-in-up">
        <button
          onClick={() => setShowSuccessModal(false)}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle size={48} className="text-green-500" />
          </div>

          <h3 className="text-2xl font-bold text-gray-800 mb-2">充值成功！</h3>
          <p className="text-gray-500 mb-6">您的账户余额已更新</p>

          <div className="bg-gradient-to-br from-caramel-50 to-cream-100 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">当前余额</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-lg text-caramel-600">¥</span>
              <span className="text-4xl font-bold text-caramel-600">
                {formatCurrency(lastRechargeResult.balance)}
              </span>
            </div>
          </div>

          {lastRechargeResult.pointsEarned > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-caramel-50 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles size={16} className="text-caramel-600" />
                <span className="font-medium text-gray-700">获得积分</span>
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold text-caramel-600">+{lastRechargeResult.pointsEarned}</span>
              </div>
            </div>
          )}

          {lastRechargeResult.coupons.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Gift size={18} className="text-bakery-strawberry" />
                <span className="font-medium text-gray-700">获得优惠券</span>
              </div>
              <div className="space-y-2">
                {lastRechargeResult.coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-bakery-strawberry/5 to-bakery-strawberry/10 rounded-xl border border-bakery-strawberry/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-bakery-strawberry/20 rounded-lg flex items-center justify-center">
                        <span className="text-bakery-strawberry font-bold">
                          ¥{coupon.value}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-800">{coupon.name}</p>
                        <p className="text-xs text-gray-500">
                          满{coupon.minSpend}可用 · {formatDate(coupon.expireDate)}到期
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowSuccessModal(false)}
            className="w-full py-4 bg-gradient-to-r from-caramel-500 to-caramel-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
