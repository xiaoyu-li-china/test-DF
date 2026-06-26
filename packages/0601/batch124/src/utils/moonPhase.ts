import { DateTime } from "luxon";
import type { MoonPhase } from "@/types/tide";

export function calculateMoonPhase(date: DateTime): MoonPhase {
  const knownNewMoon = DateTime.fromISO("2000-01-06T18:14:00+08:00", {
    zone: "Asia/Shanghai",
  });

  const synodicMonth = 29.53058867;
  const daysSinceNewMoon = date.diff(knownNewMoon, "days").days;
  const cycles = daysSinceNewMoon / synodicMonth;
  const phase = cycles - Math.floor(cycles);

  let name = "";
  if (phase < 0.03 || phase >= 0.97) {
    name = "新月";
  } else if (phase < 0.22) {
    name = "上弦";
  } else if (phase < 0.28) {
    name = "上弦月";
  } else if (phase < 0.47) {
    name = "盈凸月";
  } else if (phase < 0.53) {
    name = "满月";
  } else if (phase < 0.72) {
    name = "亏凸月";
  } else if (phase < 0.78) {
    name = "下弦月";
  } else {
    name = "残月";
  }

  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  return {
    phase,
    name,
    illumination: Math.round(illumination * 100),
  };
}
