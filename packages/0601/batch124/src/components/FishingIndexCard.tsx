import { Star, Moon, Waves, Fish } from "lucide-react";
import type { FishingIndex, MoonPhase } from "@/types/tide";

interface Props {
  fishingIndex: FishingIndex;
  moonPhase: MoonPhase;
}

export function FishingIndexCard({ fishingIndex, moonPhase }: Props) {
  const { score, reason } = fishingIndex;

  const getScoreColor = () => {
    if (score <= 2) return "text-red-500 bg-red-50 border-red-200";
    if (score === 3) return "text-amber-500 bg-amber-50 border-amber-200";
    return "text-emerald-500 bg-emerald-50 border-emerald-200";
  };

  const getStarFillColor = () => {
    if (score <= 2) return "fill-red-400 text-red-400";
    if (score === 3) return "fill-amber-400 text-amber-400";
    return "fill-emerald-400 text-emerald-400";
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${getScoreColor()} transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Fish className="w-5 h-5" />
          <span className="font-serif font-bold text-lg">适宜钓鱼指数</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 transition-all duration-300 ${
                i < score ? getStarFillColor() : "text-gray-200"
              }`}
            />
          ))}
          <span className={`ml-2 font-bold text-xl ${getScoreColor().split(" ")[0]}`}>
            {score}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 opacity-70">
          <Moon className="w-4 h-4" />
          <span>{moonPhase.name}</span>
          <span className="text-xs opacity-60">({moonPhase.illumination}%)</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-70">
          <Waves className="w-4 h-4" />
          <span>潮汐正常</span>
        </div>
      </div>

      <p className="mt-3 text-sm opacity-80 leading-relaxed">{reason}</p>
    </div>
  );
}
