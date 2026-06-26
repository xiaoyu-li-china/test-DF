import { useState } from "react";
import { Star, ChevronDown, MapPin } from "lucide-react";
import { useTideStore } from "@/store/useTideStore";
import type { SeaArea } from "@/types/tide";

export function AreaSelector() {
  const {
    selectedAreaId,
    favoriteAreaIds,
    setSelectedAreaId,
    toggleFavorite,
    getSortedAreas,
    loading,
  } = useTideStore();

  const [isOpen, setIsOpen] = useState(false);
  const [animatingStar, setAnimatingStar] = useState<string | null>(null);
  const sortedAreas = getSortedAreas();
  const selectedArea = sortedAreas.find((a) => a.id === selectedAreaId);

  const handleToggleFavorite = (e: React.MouseEvent, areaId: string) => {
    e.stopPropagation();
    setAnimatingStar(areaId);
    toggleFavorite(areaId);
    setTimeout(() => setAnimatingStar(null), 300);
  };

  const handleSelect = (area: SeaArea) => {
    if (area.id !== selectedAreaId) {
      setSelectedAreaId(area.id);
    }
    setIsOpen(false);
  };

  const renderAreaItem = (area: SeaArea) => {
    const isSelected = area.id === selectedAreaId;
    const isFavorite = favoriteAreaIds.includes(area.id);
    const isAnimating = animatingStar === area.id;

    return (
      <button
        key={area.id}
        onClick={() => handleSelect(area)}
        className={`
          w-full px-4 py-3 flex items-center justify-between
          transition-all duration-200 rounded-lg
          ${isSelected ? "bg-ocean-700 text-white" : "hover:bg-ocean-100 text-ocean-900"}
          ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        disabled={loading}
      >
        <div className="flex items-center gap-3">
          {isFavorite && (
            <Star className="w-4 h-4 text-coral-400 fill-coral-400 flex-shrink-0" />
          )}
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 opacity-60" />
            <span className="font-medium">{area.name}</span>
            <span className="text-xs opacity-60">
              {area.lat.toFixed(2)}°N {area.lng.toFixed(2)}°E
            </span>
          </span>
        </div>
        <button
          onClick={(e) => handleToggleFavorite(e, area.id)}
          className={`
            p-1.5 rounded-full transition-all
            hover:bg-white/20
            ${isAnimating ? "animate-star-pop" : ""}
          `}
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              isFavorite
                ? "text-coral-400 fill-coral-400"
                : "text-ocean-300 hover:text-coral-300"
            }`}
          />
        </button>
      </button>
    );
  };

  const favorites = sortedAreas.filter((a) => favoriteAreaIds.includes(a.id));
  const others = sortedAreas.filter((a) => !favoriteAreaIds.includes(a.id));

  return (
    <div className="relative w-full">
      <button
        onClick={() => !loading && setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-3 bg-ocean-700 text-white rounded-xl
          flex items-center justify-between
          transition-all duration-200
          hover:bg-ocean-800
          ${isOpen ? "shadow-tide-glow" : ""}
          ${loading ? "opacity-70" : ""}
        `}
        disabled={loading}
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-tide-300" />
          <span className="font-serif text-lg font-bold">
            {selectedArea?.name || "选择海域"}
          </span>
          {selectedArea && favoriteAreaIds.includes(selectedArea.id) && (
            <Star className="w-4 h-4 text-coral-400 fill-coral-400" />
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-tide-300 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-ocean-100 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {favorites.length > 0 && (
            <div className="p-2">
              <div className="px-4 py-2 text-xs font-semibold text-ocean-500 uppercase tracking-wider">
                收藏钓点
              </div>
              {favorites.map(renderAreaItem)}
            </div>
          )}
          {favorites.length > 0 && others.length > 0 && (
            <div className="border-t border-ocean-100 mx-2" />
          )}
          <div className="p-2">
            {favorites.length > 0 && (
              <div className="px-4 py-2 text-xs font-semibold text-ocean-500 uppercase tracking-wider">
                其他海域
              </div>
            )}
            {others.map(renderAreaItem)}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
