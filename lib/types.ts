export interface SleepRecord {
  id: string;
  date: string; // YYYY-MM-DD
  bedtime: string; // HH:mm
  wakeTime: string; // HH:mm
  person: string;
  createdAt: number;
  isMc?: boolean; // menstrual cycle marker
}
