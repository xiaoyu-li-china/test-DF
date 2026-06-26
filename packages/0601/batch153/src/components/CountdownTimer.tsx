import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatTimeRemaining } from '../utils/seatUtils';
import { useSeatStore } from '../store/useSeatStore';

export default function CountdownTimer() {
  const { lockExpireAt, isLocked, handleLockExpired } = useSeatStore();
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!lockExpireAt || !isLocked) {
      setTimeLeft(0);
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const remaining = lockExpireAt - now;
      setTimeLeft(Math.max(0, remaining));

      if (remaining <= 0) {
        handleLockExpired();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lockExpireAt, isLocked, handleLockExpired]);

  if (!isLocked || timeLeft <= 0) return null;

  const isUrgent = timeLeft <= 60000;

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        px-6 py-3 rounded-full backdrop-blur-md
        flex items-center gap-3 shadow-lg
        transition-all duration-300
        ${isUrgent
          ? 'bg-red-900/80 border border-red-500/50 animate-pulse'
          : 'bg-gray-900/80 border border-yellow-500/30'
        }
      `}
    >
      <Clock
        className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-yellow-400'}`}
      />
      <span className="text-white font-medium">
        锁座剩余时间：
      </span>
      <span
        className={`
          font-mono font-bold text-xl
          ${isUrgent ? 'text-red-400 animate-pulse' : 'text-yellow-400'}
        `}
      >
        {formatTimeRemaining(timeLeft)}
      </span>
    </div>
  );
}
