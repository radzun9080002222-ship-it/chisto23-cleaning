import type { CityId } from "./pricing.ts";

export const CALENDAR_REMINDERS = [
  { method: "popup", minutes: 24 * 60 },
  { method: "popup", minutes: 60 },
  { method: "popup", minutes: 0 },
] as const;

export type CalendarReminderPolicy = "order" | "none" | "followUp";

export const calendarReminderSettings = (policy: CalendarReminderPolicy) => ({
  useDefault: false,
  overrides: policy === "none" ? [] : policy === "followUp" ? [{ method: "popup", minutes: 10 }] : CALENDAR_REMINDERS,
});

export const calendarEventOptions = (policy: CalendarReminderPolicy, orderColor = "7") => ({
  colorId: policy === "followUp" ? "5" : orderColor,
  transparency: policy === "followUp" ? "transparent" : "opaque",
  reminders: calendarReminderSettings(policy),
});

export function assertCalendarActionAllowed(cityId: CityId | undefined, policy: CalendarReminderPolicy) {
  if (cityId === "unknown" && policy !== "none") {
    throw new Error("Для города «Не определен» доступно только действие «Узнавали цену»");
  }
}
