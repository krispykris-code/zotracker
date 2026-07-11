export function calcDuration(bedtime: string, wakeTime: string): string {
  const mins = calcMinutes(bedtime, wakeTime);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function calcMinutes(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60; // overnight
  return mins;
}

export function calcHours(bedtime: string, wakeTime: string): number {
  return Math.round((calcMinutes(bedtime, wakeTime) / 60) * 10) / 10;
}

export function durationColor(bedtime: string, wakeTime: string): string {
  const mins = calcMinutes(bedtime, wakeTime);
  if (mins >= 420) return "text-emerald-400"; // >= 7h
  if (mins >= 360) return "text-amber-300"; // >= 6h
  return "text-rose-400"; // < 6h
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return weekdays[d.getDay()];
}

export function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function timeStr(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

export function smartDefaults(): {
  date: string;
  bedtime: string;
  wakeTime: string;
} {
  const now = new Date();
  const hour = now.getHours();
  const nowTime = timeStr(now);

  if (hour >= 6 && hour < 14) {
    const bed = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    return { date: todayStr(), bedtime: timeStr(bed), wakeTime: nowTime };
  } else {
    return { date: todayStr(), bedtime: nowTime, wakeTime: "" };
  }
}

// Chart line colors per person
const chartColorPalette = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#fbbf24", // amber
  "#fb7185", // rose
  "#22d3ee", // cyan
  "#a855f7", // purple
  "#f472b6", // pink
  "#2dd4bf", // teal
];

const personChartColors: Record<string, string> = {};

export function getPersonChartColor(name: string): string {
  if (!personChartColors[name]) {
    const idx =
      Object.keys(personChartColors).length % chartColorPalette.length;
    personChartColors[name] = chartColorPalette[idx];
  }
  return personChartColors[name];
}
