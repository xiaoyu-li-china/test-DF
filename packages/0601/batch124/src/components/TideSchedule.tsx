import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import type { TideEvent } from "@/types/tide";
import { parseTideTime, formatTideTime } from "@/utils/timeConverter";

interface Props {
  events: TideEvent[];
}

export function TideSchedule({ events }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Clock className="w-4 h-4 text-ocean-500" />
        <h3 className="font-serif font-bold text-ocean-800">高低潮时刻</h3>
      </div>

      <div className="space-y-2">
        {events.map((event, index) => {
          const isHigh = event.type === "high";
          const time = parseTideTime(event.time);
          const displayTime = formatTideTime(time, "HH:mm");

          return (
            <div
              key={`${event.time}-${index}`}
              className={`
                relative pl-4 pr-4 py-3 rounded-xl
                bg-sand-50 border-l-4 transition-all duration-200
                hover:shadow-md hover:-translate-y-0.5
                ${isHigh ? "border-l-coral-400" : "border-l-tide-400"}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      p-2 rounded-full
                      ${isHigh ? "bg-coral-100 text-coral-500" : "bg-tide-100 text-tide-500"}
                    `}
                  >
                    {isHigh ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-ocean-800">
                        {displayTime}
                      </span>
                      {event.isNextDay && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          次日
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ocean-500">
                      {isHigh ? "高潮" : "低潮"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-bold text-xl ${
                      isHigh ? "text-coral-500" : "text-tide-500"
                    }`}
                  >
                    {event.height.toFixed(0)}
                    <span className="text-sm font-normal opacity-70 ml-1">cm</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
