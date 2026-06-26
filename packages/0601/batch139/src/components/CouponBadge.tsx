import { Gift } from 'lucide-react';
import type { Bonus } from '@/types';

interface CouponBadgeProps {
  bonus: Bonus;
  pulse?: boolean;
}

export default function CouponBadge({ bonus, pulse = false }: CouponBadgeProps) {
  const isCash = bonus.type === 'cash';

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isCash
          ? 'bg-green-100 text-green-700'
          : 'bg-bakery-strawberry/10 text-bakery-strawberry'
      } ${pulse ? 'animate-pulse-slow' : ''}`}
    >
      <Gift size={12} />
      <span>{bonus.description}</span>
    </div>
  );
}
