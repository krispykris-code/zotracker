import { SleepRecord } from "./types";
import { calcMinutes } from "./sleep";
import { yesterdayStr } from "./dates";

// ─── Service Worker Registration ─────────────────────
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

// ─── Notification Permission ─────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function canNotify(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

// ─── Check yesterday's sleep ─────────────────────────
export function getYesterdaySleep(
  records: SleepRecord[],
  person: string
): { sleptUnder7h: boolean; duration: number | null } {
  const yesterday = yesterdayStr();
  const rec = records.find((r) => r.date === yesterday && r.person === person);
  if (!rec) return { sleptUnder7h: false, duration: null }; // no record = don't nag
  const mins = calcMinutes(rec.bedtime, rec.wakeTime);
  return { sleptUnder7h: mins < 420, duration: mins };
}

// ─── Schedule 11pm reminder via Service Worker ───────
// KNOWN LIMITATION: the reminder is delivered via setTimeout inside the service
// worker (see public/sw.js). iOS terminates idle service workers within ~30s,
// so the 11pm notification usually won't fire unless the app is in the
// foreground. Reliable delivery would require the Push API + a server.
// Keeping as-is is a deliberate decision (2026-07).
export function scheduleReminder(person: string): void {
  if (!canNotify() || !navigator.serviceWorker.controller) return;

  const now = new Date();
  const tonight23 = new Date(now);
  tonight23.setHours(23, 0, 0, 0);

  const delayMs = tonight23.getTime() - now.getTime();
  if (delayMs <= 0) return; // already past 11pm

  // Don't reschedule if already scheduled today
  const scheduleKey = `zotracker-reminder-${now.toLocaleDateString("sv-SE")}`;
  if (localStorage.getItem(scheduleKey)) return;
  localStorage.setItem(scheduleKey, "1");

  navigator.serviceWorker.controller.postMessage({
    type: "SCHEDULE_REMINDER",
    delayMs,
    title: "🌙 ZoTracker 提醒",
    body: `${person}，昨天睡不到 7 小時喔！今天記得早點睡 💤`,
  });
}
