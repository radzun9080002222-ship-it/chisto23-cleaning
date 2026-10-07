import type { CityId } from "./pricing.ts";

export const CALENDAR_REMINDERS = [
  { method: "popup", minutes: 24 * 60 },
  { method: "popup", minutes: 60 },
  { method: "popup", minutes: 0 },
] as const;

export type CalendarReminderPolicy = "order" | "none";

export const calendarReminderSettings = (policy: CalendarReminderPolicy) => ({
  useDefault: false,
  overrides: policy === "none" ? [] : CALENDAR_REMINDERS,
});

export function assertCalendarActionAllowed(cityId: CityId | undefined, policy: CalendarReminderPolicy) {
  if (cityId === "unknown" && policy !== "none") {
    throw new Error("Для города «Не определен» доступно только действие «Узнавали цену»");
  }
}
