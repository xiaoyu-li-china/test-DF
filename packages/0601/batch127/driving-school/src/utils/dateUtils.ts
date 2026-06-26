export function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const day = baseDate.getDay();
  const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(baseDate.setDate(diff));
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function getWeekRangeStr(dates: Date[]): string {
  if (dates.length === 0) return '';
  const start = dates[0];
  const end = dates[dates.length - 1];
  return `${formatDateDisplay(start)} - ${formatDateDisplay(end)}`;
}

export const HOURS: number[] = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export const WEEK_DAYS: string[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
