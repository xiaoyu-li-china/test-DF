import { useState, useEffect, useRef } from 'react';
import { CreditCard, Crown, Eye, EyeOff, QrCode, Gift } from 'lucide-react';
import { useMemberStore } from '@/hooks/useMemberStore';
import { formatCurrency, maskCardNumber } from '@/utils/formatters';

interface BalanceCardProps {
  onShowQRCode: () => void;
}

export default function BalanceCard({ onShowQRCode }: BalanceCardProps) {
  const memberInfo = useMemberStore((state) => state.memberInfo);
  const loading = useMemberStore((state) => state.loading);
  const [showBalance, setShowBalance] = useState(true);
  const [displayBalance, setDisplayBalance] = useState(0);
  const animationRef = useRef<number | null>(null);

  const isBirthdayMonth = (() => {
    if (!memberInfo?.birthday) return false;
    const birthday = new Date(memberInfo.birthday);
    const now = new Date();
    return birthday.getMonth() === now.getMonth();
  })();

  useEffect(() => {
    if (memberInfo?.balance !== undefined) {
      const target = memberInfo.balance;
      const duration = 800;
      const startTime = performance.now();
      const startValue = displayBalance;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (target - startValue) * easeOut;
        setDisplayBalance(current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayBalance(target);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [memberInfo?.balance]);

  if (loading.member) {
    return (
      <div className="w-full h-48 bg-gradient-to-br from-caramel-200 to-caramel-400 rounded-3xl animate-pulse" />
    );
  }

  if (!memberInfo) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-caramel-300 via-caramel-400 to-caramel-600 p-6 text-white shadow-lg">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -right-12 top-20 w-24 h-24 rounded-full bg-white/5" />
      <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />

      <div className="absolute right-6 top-6 opacity-20">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM18 8C19.1 8 20 8.9 20 10C20 11.1 19.1 12 18 12C16.9 12 16 11.1 16 10C16 8.9 16.9 8 18 8ZM6 8C7.1 8 8 8.9 8 10C8 11.1 7.1 12 6 12C4.9 12 4 11.1 4 10C4 8.9 4.9 8 6 8ZM12 22L2 20V18C2 15.8 6.5 14 12 14C17.5 14 22 15.8 22 18V20L12 22Z" />
        </svg>
      </div>

      <div className="relative z-10">
        {isBirthdayMonth && (
          <div className="absolute -top-1 -right-1 animate-pulse-slow">
            <div className="flex items-center gap-1 px-2 py-1 bg-bakery-strawberry rounded-full text-white text-xs font-medium shadow-lg">
              <Gift size={12} />
              <span>生日月双倍积分</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-yellow-200" />
            <span className="text-sm font-medium text-white/90">{memberInfo.memberLevel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">{memberInfo.memberName}</span>
            <button
              onClick={onShowQRCode}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <QrCode size={18} className="text-white" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/70">账户余额</span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-white/70 hover:text-white transition-colors"
            >
              {showBalance ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg">¥</span>
            <span className="text-4xl font-bold font-display tabular-nums animate-count-up">
              {showBalance ? formatCurrency(displayBalance) : '****.**'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white/10 rounded-xl">
          <Gift size={14} className="text-yellow-200" />
          <span className="text-sm text-white/90">积分: </span>
          <span className="text-lg font-bold text-white">
            {memberInfo.points?.toLocaleString() || 0}
          </span>
          {isBirthdayMonth && (
            <span className="ml-auto text-xs bg-bakery-strawberry/80 text-white px-2 py-0.5 rounded-full">
              双倍积分中
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-white/70" />
            <span className="text-sm text-white/70 tracking-wider">
              {maskCardNumber(memberInfo.cardNumber)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-5 bg-red-500/80 rounded-sm" />
            <div className="w-8 h-5 bg-yellow-400/80 rounded-sm -ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
