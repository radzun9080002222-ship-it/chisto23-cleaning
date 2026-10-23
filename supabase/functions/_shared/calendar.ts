import type { CityId } from "./pricing.ts";

export type CalendarReminderPolicy = "order" | "none" | "followUp";

export const calendarReminderSettings = (_policy: CalendarReminderPolicy) => ({
  useDefault: false,
  overrides: [],
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

export function appendCreationDate(description: string, createdAt: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", year: "numeric", weekday: "long",
    hour: "numeric", minute: "2-digit", hourCycle: "h23", timeZone,
  }).formatToParts(createdAt);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)!.value;
  const stamp = `${part("day")} ${part("month")} ${part("year")} (${part("weekday")}), ${Number(part("hour"))}:${part("minute")}`;
  return `${description}\n\nДата создания: ${stamp}`;
}

export type CalculatorCalendarEvent = {
  id: string;
  etag?: string;
  description?: string;
  status?: string;
  extendedProperties?: { private?: Record<string, string> };
  reminders?: { useDefault?: boolean; overrides?: unknown[] };
};

export function isCalculatorEvent(event: CalculatorCalendarEvent) {
  const description = (event.description || "").trimStart();
  return event.extendedProperties?.private?.source === "vershina-manager-calc"
    || description.startsWith("Расчёт стоимости уборки «Вершина»")
    || description.startsWith("Статистика конверсий: узнавали цену")
    || description.startsWith("Следующий контакт — заказ ещё не подтверждён");
}

export function needsReminderCleanup(event: CalculatorCalendarEvent) {
  return event.status !== "cancelled" && isCalculatorEvent(event)
    && (event.reminders?.useDefault !== false || Boolean(event.reminders?.overrides?.length));
}
