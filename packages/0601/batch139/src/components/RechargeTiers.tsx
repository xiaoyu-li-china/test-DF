import { Check, Wallet } from 'lucide-react';
import { useMemberStore } from '@/hooks/useMemberStore';
import CouponBadge from './CouponBadge';
import type { RechargeTier } from '@/types';

interface TierCardProps {
  tier: RechargeTier;
  isSelected: boolean;
  onSelect: () => void;
  delay: number;
}

function TierCard({ tier, isSelected, onSelect, delay }: TierCardProps) {
  const isHighest = tier.amount === 500;

  return (
    <button
      onClick={onSelect}
      className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in-up ${
        isSelected
          ? 'border-caramel-500 bg-caramel-50 shadow-lg scale-105'
          : 'border-gray-200 bg-white hover:border-caramel-300'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isHighest && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-caramel-500 to-caramel-600 text-white text-xs font-medium rounded-full shadow-md">
          最划算
        </div>
      )}

      <div className="flex items-baseline gap-0.5 mb-2">
        <span className="text-sm text-gray-500">¥</span>
        <span className={`text-3xl font-bold ${isSelected ? 'text-caramel-600' : 'text-gray-800'}`}>
          {tier.amount}
        </span>
      </div>

      <div className="flex flex-col gap-1 w-full">
        {tier.bonus.map((bonus, idx) => (
          <CouponBadge key={idx} bonus={bonus} pulse={isHighest && isSelected} />
        ))}
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-caramel-500 rounded-full flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}
    </button>
  );
}

export default function RechargeTiers() {
  const { rechargeTiers, loading, selectedTierId, selectTier, setShowRechargeModal } =
    useMemberStore();

  if (loading.tiers) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">充值中心</h3>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Wallet size={14} />
          <span>多充多送</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {rechargeTiers.map((tier, index) => (
          <TierCard
            key={tier.id}
            tier={tier}
            isSelected={selectedTierId === tier.id}
            onSelect={() => selectTier(selectedTierId === tier.id ? null : tier.id)}
            delay={index * 100}
          />
        ))}
      </div>

      {selectedTierId && (
        <button
          onClick={() => setShowRechargeModal(true)}
          className="w-full py-4 bg-gradient-to-r from-caramel-500 to-caramel-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-fade-in-up"
        >
          立即充值 ¥{rechargeTiers.find((t) => t.id === selectedTierId)?.amount}
        </button>
      )}
    </div>
  );
}
