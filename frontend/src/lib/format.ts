import { format, isThisYear, isToday, isYesterday } from "date-fns";

/** The API returns naive UTC datetimes ("2026-10-06T10:00:00"); parse them as UTC. */
export function parseApiDate(value: string): Date {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
}

/** 125 → "2:05", 3725 → "1:02:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** 436 → "7 min", 3900 → "1h 5m", 40 → "< 1 min" */
export function formatDuration(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Day heading used to group the meetings list: "Today", "Yesterday", "Mon, Oct 3". */
export function formatDayHeading(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, isThisYear(date) ? "EEE, MMM d" : "EEE, MMM d, yyyy");
}

export function formatMeetingDate(date: Date): string {
  return format(date, isThisYear(date) ? "MMM d, h:mm a" : "MMM d yyyy, h:mm a");
}
