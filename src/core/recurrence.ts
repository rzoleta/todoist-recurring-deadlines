import { addDays, addMonthsClamped, addYearsClamped } from "./date";
import type { RecurrenceInterval } from "./types";

export function parseRecurrenceInterval(dueString: string): RecurrenceInterval | null {
  const normalized = dueString.trim().toLowerCase();

  if (normalized === "daily" || normalized === "every day") return "daily";
  if (normalized === "weekly" || normalized === "every week") return "weekly";
  if (normalized === "monthly" || normalized === "every month") return "monthly";
  if (["yearly", "annually", "every year"].includes(normalized)) return "yearly";
  if (/^every \d+(st|nd|rd|th)?$/.test(normalized)) return "monthly";

  return null;
}

export function advanceDate(date: string, interval: RecurrenceInterval): string {
  switch (interval) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "monthly":
      return addMonthsClamped(date, 1);
    case "yearly":
      return addYearsClamped(date, 1);
  }
}
