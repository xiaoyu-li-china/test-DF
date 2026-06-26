import { X, CreditCard, Smartphone, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useMemberStore } from '@/hooks/useMemberStore';
import { formatCurrency } from '@/utils/formatters';
import type { InvoiceInfo } from '@/types';
import CouponBadge from './CouponBadge';

export default function RechargeModal() {
  const {
    showRechargeModal,
    setShowRechargeModal,
    selectedTierId,
    rechargeTiers,
    loading,
    executeRecharge,
  } = useMemberStore();

  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [needInvoice, setNeedInvoice] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceInfo>({
    type: 'personal',
    title: '',
    taxNumber: '',
    email: '',
  });

  const selectedTier = rechargeTiers.find((t) => t.id === selectedTierId);

  if (!showRechargeModal || !selectedTier) return null;

  const handleConfirm = async () => {
    if (loading.recharge) return;
    await executeRecharge(selectedTier.id, needInvoice ? invoice : undefined);
  };

  const handleClose = () => {
    if (!loading.recharge) {
      setShowRechargeModal(false);
    }
  };

  const totalBonus = selectedTier.bonus.reduce((sum, b) => sum + b.value, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">确认充值</h3>
          <button
            onClick={handleClose}
            disabled={loading.recharge}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center py-6 mb-6 bg-gradient-to-br from-caramel-50 to-cream-100 rounded-2xl">
          <p className="text-sm text-gray-500 mb-1">充值金额</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-xl text-caramel-600">¥</span>
            <span className="text-5xl font-bold text-caramel-600">
              {selectedTier.amount}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {selectedTier.bonus.map((bonus, idx) => (
              <div key={idx} className="flex justify-center">
                <CouponBadge bonus={bonus} pulse />
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            共获得价值 <span className="text-bakery-strawberry font-semibold">¥{totalBonus}</span> 的优惠
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">选择支付方式</p>
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod('wechat')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'wechat'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Smartphone size={18} className="text-white" />
              </div>
              <span className="font-medium">微信支付</span>
              {paymentMethod === 'wechat' && (
                <div className="ml-auto w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <X size={12} className="text-white" />
                </div>
              )}
            </button>

            <button
              onClick={() => setPaymentMethod('alipay')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'alipay'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <CreditCard size={18} className="text-white" />
              </div>
              <span className="font-medium">支付宝</span>
              {paymentMethod === 'alipay' && (
                <div className="ml-auto w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <X size={12} className="text-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={() => {
              setNeedInvoice(!needInvoice);
              if (!needInvoice) setShowInvoiceForm(true);
            }}
            className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-caramel-300 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                needInvoice ? 'bg-caramel-500 border-caramel-500' : 'border-gray-300'
              }`}>
                {needInvoice && <X size={14} className="text-white" />}
              </div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-gray-500" />
                <span className="font-medium text-gray-700">需要发票</span>
              </div>
            </div>
            {needInvoice && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInvoiceForm(!showInvoiceForm);
                }}
              >
                {showInvoiceForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
          </button>

          {needInvoice && showInvoiceForm && (
            <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-4 animate-fade-in-up">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">发票类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInvoice({ ...invoice, type: 'personal' })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      invoice.type === 'personal'
                        ? 'bg-caramel-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:border-caramel-300'
                    }`}
                  >
                    个人
                  </button>
                  <button
                    onClick={() => setInvoice({ ...invoice, type: 'company' })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      invoice.type === 'company'
                        ? 'bg-caramel-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-600 hover:border-caramel-300'
                    }`}
                  >
                    企业
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {invoice.type === 'personal' ? '个人抬头' : '公司名称'}
                </label>
                <input
                  type="text"
                  value={invoice.title}
                  onChange={(e) => setInvoice({ ...invoice, title: e.target.value })}
                  placeholder={invoice.type === 'personal' ? '请输入个人姓名' : '请输入公司名称'}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-caramel-500 focus:ring-1 focus:ring-caramel-500 outline-none transition-all"
                />
              </div>

              {invoice.type === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">税号</label>
                  <input
                    type="text"
                    value={invoice.taxNumber}
                    onChange={(e) => setInvoice({ ...invoice, taxNumber: e.target.value })}
                    placeholder="请输入纳税人识别号"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-caramel-500 focus:ring-1 focus:ring-caramel-500 outline-none transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接收邮箱</label>
                <input
                  type="email"
                  value={invoice.email}
                  onChange={(e) => setInvoice({ ...invoice, email: e.target.value })}
                  placeholder="请输入发票接收邮箱"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-caramel-500 focus:ring-1 focus:ring-caramel-500 outline-none transition-all"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={loading.recharge}
          className="w-full py-4 bg-gradient-to-r from-caramel-500 to-caramel-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading.recharge ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>充值中...</span>
            </>
          ) : (
            <span>确认支付 ¥{formatCurrency(selectedTier.amount)}</span>
          )}
        </button>
      </div>
    </div>
  );
}
