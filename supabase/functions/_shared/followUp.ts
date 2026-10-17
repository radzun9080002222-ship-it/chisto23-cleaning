export const FOLLOW_UP_STATUSES = ["Думает", "Ждём подтверждения", "Перезвонить", "Другое"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export function localCalendarTime(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23", timeZone,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:00`;
}

export function followUpSlot(startDateTime: string, timeZone: string, now = new Date()) {
  const value = new Date(`${startDateTime}Z`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(startDateTime)
    || !Number.isFinite(value.getTime()) || value.toISOString().slice(0, 19) !== startDateTime) {
    throw new Error("Укажите корректные дату и время связи");
  }
  if (startDateTime <= localCalendarTime(now, timeZone)) {
    throw new Error("Выберите будущее время связи");
  }
  return {
    startDateTime,
    endDateTime: new Date(value.getTime() + 15 * 60_000).toISOString().slice(0, 19),
  };
}
