import { Play, Pause, SkipBack, SkipForward, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface TimelineSliderProps {
  times: string[];
  currentIndex: number;
  isPlaying: boolean;
  onIndexChange: (index: number | ((prev: number) => number)) => void;
  onPlayToggle: () => void;
}

export default function TimelineSlider({
  times,
  currentIndex,
  isPlaying,
  onIndexChange,
  onPlayToggle,
}: TimelineSliderProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onIndexChange((prev) => (prev + 1) % times.length);
      }, 1500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, times.length, onIndexChange]);

  const progress = (currentIndex / (times.length - 1)) * 100;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[520px]
        bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-cyan-300" />
          <span
            className="text-sm font-bold text-white/90 min-w-[48px] text-center"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            {times[currentIndex]}
          </span>
        </div>

        <button
          onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white
            transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipBack size={14} />
        </button>

        <button
          onClick={onPlayToggle}
          className="p-2 rounded-full bg-cyan-500/30 hover:bg-cyan-500/50 text-cyan-300
            transition-all duration-200 cursor-pointer border border-cyan-400/30"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          onClick={() => onIndexChange(Math.min(times.length - 1, currentIndex + 1))}
          disabled={currentIndex === times.length - 1}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white
            transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipForward size={14} />
        </button>

        <div className="flex-1 relative">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400
                transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={times.length - 1}
            value={currentIndex}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex justify-between mt-1.5">
            {times.map((t, i) => (
              <div
                key={i}
                className={`text-[9px] transition-colors duration-200 ${
                  i === currentIndex ? "text-cyan-300" : "text-white/30"
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
