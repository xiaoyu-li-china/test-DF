import { DateTime } from "luxon";
import type { TideApiResponse, DailyTide } from "@/types/tide";
import { SEA_AREAS } from "@/fixtures/seaAreas";
import { TIDAL_CONSTANTS, CURRENT_SPEED_COEF } from "@/fixtures/tidalConstants";
import {
  generateTideCurve,
  detectTideEvents,
  computeCurrentSpeed,
} from "@/utils/tideCalculator";
import { processDayTide } from "@/utils/tideBoundary";
import { calculateMoonPhase } from "@/utils/moonPhase";
import { calculateFishingIndex } from "@/utils/fishingIndex";
import { getNextDays } from "@/utils/timeConverter";

export async function fetchTideData(
  areaId: string,
  startDate?: string,
  days: number = 4
): Promise<TideApiResponse> {
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

  const area = SEA_AREAS.find((a) => a.id === areaId);
  if (!area) {
    return {
      status: "error",
      area: SEA_AREAS[0],
      forecast: [],
      requestTime: DateTime.now().setZone("Asia/Shanghai").toISO() || "",
    };
  }

  const dates = startDate
    ? Array.from({ length: days }, (_, i) =>
        DateTime.fromFormat(startDate, "yyyy-MM-dd", { zone: "Asia/Shanghai" })
          .plus({ days: i })
          .toFormat("yyyy-MM-dd")
      )
    : getNextDays(days);

  const constants = TIDAL_CONSTANTS[areaId] || TIDAL_CONSTANTS.xiangshan;
  const currentCoef = CURRENT_SPEED_COEF[areaId] || 0.018;

  const forecast: DailyTide[] = [];

  const extendedCurve = generateTideCurve(dates[0], constants, 3, 24 * days);
  const curveWithCurrent = computeCurrentSpeed(extendedCurve, currentCoef);
  const allEvents = detectTideEvents(curveWithCurrent);

  for (const dateStr of dates) {
    let dayTide = processDayTide(curveWithCurrent, allEvents, dateStr);

    const moonPhase = calculateMoonPhase(
      DateTime.fromFormat(dateStr, "yyyy-MM-dd", { zone: "Asia/Shanghai" })
    );

    const fishingIndex = calculateFishingIndex(dayTide, moonPhase.illumination);

    dayTide = {
      ...dayTide,
      moonPhase,
      fishingIndex,
    };

    forecast.push(dayTide);
  }

  return {
    status: "success",
    area,
    forecast,
    requestTime: DateTime.now().setZone("Asia/Shanghai").toISO() || "",
  };
}
