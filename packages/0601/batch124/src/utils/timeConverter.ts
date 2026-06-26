import { DateTime, Settings } from "luxon";

Settings.defaultZone = "Asia/Shanghai";

export function normalizeTime(rawTime: string | number): string {
  let dt: DateTime;

  if (typeof rawTime === "number") {
    dt = DateTime.fromSeconds(rawTime, { zone: "Asia/Shanghai" });
  } else if (rawTime.includes("T")) {
    dt = DateTime.fromISO(rawTime);
  } else {
    dt = DateTime.fromFormat(rawTime, "yyyy-MM-dd HH:mm", {
      zone: "Asia/Shanghai",
    });
  }

  return dt.setZone("Asia/Shanghai").toISO() || "";
}

export function parseTideTime(isoString: string): DateTime {
  return DateTime.fromISO(isoString).setZone("Asia/Shanghai");
}

export function formatTideTime(dt: DateTime, fmt = "HH:mm"): string {
  return dt.setZone("Asia/Shanghai").toFormat(fmt);
}

export function getStartOfDay(dateStr: string): DateTime {
  return DateTime.fromFormat(dateStr, "yyyy-MM-dd", {
    zone: "Asia/Shanghai",
  }).startOf("day");
}

export function getDateString(dt: DateTime): string {
  return dt.setZone("Asia/Shanghai").toFormat("yyyy-MM-dd");
}

export function getRelativeDateLabel(dateStr: string): string {
  const today = DateTime.now().startOf("day");
  const target = getStartOfDay(dateStr);
  const diffDays = Math.round(target.diff(today, "days").days);

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "明日";
  if (diffDays === 2) return "后日";
  if (diffDays === 3) return "大后日";
  return "";
}

export function getNextDays(count: number): string[] {
  const today = DateTime.now().startOf("day");
  return Array.from({ length: count }, (_, i) =>
    today.plus({ days: i }).toFormat("yyyy-MM-dd")
  );
}
