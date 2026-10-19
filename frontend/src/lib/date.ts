import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDateTime(
  dateInput: string | Date | null | undefined,
  formatString: string = "dd MMM yyyy, hh:mm a"
): string {
  if (!dateInput) return "—";
  try {
    const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";
    return format(date, formatString);
  } catch (err) {
    return "—";
  }
}

export function formatDateOnly(dateInput: string | Date | null | undefined): string {
  return formatDateTime(dateInput, "dd MMM yyyy");
}

export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (err) {
    return "—";
  }
}

export function formatLiveDate(date: Date = new Date()): string {
  try {
    return format(date, "EEEE, dd MMMM yyyy");
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatShortLiveDate(date: Date = new Date()): string {
  try {
    return format(date, "dd MMM yyyy");
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatLiveClock(date: Date = new Date()): string {
  try {
    return format(date, "hh:mm:ss a");
  } catch {
    return date.toLocaleTimeString();
  }
}

export function getRecentDays(count: number = 7) {
  const days = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      day: format(d, "EEE"),
      date: format(d, "MMM dd"),
      fullDate: d,
    });
  }
  return days;
}
