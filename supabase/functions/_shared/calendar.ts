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
