import { useTideStore } from "@/store/useTideStore";
import { getRelativeDateLabel, getNextDays } from "@/utils/timeConverter";

export function DateTabs() {
  const { selectedDateIndex, setSelectedDateIndex, tideData } = useTideStore();
  const dates = tideData?.forecast.map((d) => d.date) || getNextDays(4);

  return (
    <div className="flex gap-2 p-1 bg-ocean-50 rounded-full">
      {dates.map((date, index) => {
        const isSelected = index === selectedDateIndex;
        const label = getRelativeDateLabel(date);
        const displayDate = date.slice(5).replace("-", "/");

        return (
          <button
            key={date}
            onClick={() => setSelectedDateIndex(index)}
            className={`
              flex-1 py-2.5 px-3 rounded-full
              text-sm font-medium transition-all duration-300
              flex flex-col items-center gap-0.5
              ${isSelected
                ? "bg-tide-500 text-white shadow-tide-glow animate-pulse-glow"
                : "text-ocean-700 hover:bg-ocean-100"
              }
            `}
          >
            <span className="text-base font-bold">{label}</span>
            <span className={`text-xs ${isSelected ? "text-tide-100" : "text-ocean-400"}`}>
              {displayDate}
            </span>
          </button>
        );
      })}
    </div>
  );
}
