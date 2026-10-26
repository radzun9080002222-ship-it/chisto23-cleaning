import test from "node:test";
import assert from "node:assert/strict";
import { computeAchievements, parseCalendar } from "../supabase/functions/_shared/achievements.ts";
import { buildNotifications, emptyState, parseCommand, achievementsSummary } from "../supabase/functions/_shared/teamBot.ts";

const event = (id, start, summary, description) => ({ id, summary, description, created: `${start.slice(0, 10)}T06:00:00Z`, start: { dateTime: start, timeZone: "Europe/Moscow" } });
const order = (city) => `Расчёт стоимости уборки «Вершина»\n\n• Генеральная уборка, 40 м² × 250 ₽ — 10 000 ₽\nЦЕНА ДЛЯ КЛИЕНТА: 13 000 ₽\nРасходы: 8 000 ₽\n\nДанные клиента:\nГород: ${city}`;
const data = (events, now) => { const { orders, inquiries } = parseCalendar(events); return { orders, inquiries, achievements: computeAchievements({ events, now: new Date(now) }) }; };

test("Первая проверка молчит, дальше — новые заказы, выполнения и открытие ачивок", () => {
  const base = [event("a", "2026-08-04T10:00:00+03:00", "Генеральная уборка, 40 м² - выполнен и оплачен", order("Сочи"))];
  const first = buildNotifications(emptyState(), data(base, "2026-10-27T10:00:00Z"));
  assert.deepEqual(first.messages, []);

  const withNew = [...base,
    event("b", "2026-10-29T10:00:00+03:00", "Мойка окон", order("Киров")),
    event("q", "2026-10-27T12:00:00+03:00", "Узнавали цену — Тула, 60 м²", "Статистика конверсий: узнавали цену\n\nИТОГО: 27 000 ₽\n\nДанные клиента:\nГород: Тула")];
  const second = buildNotifications(first.next, data(withNew, "2026-10-27T12:00:00Z"));
  assert.equal(second.messages.length, 1);
  assert.match(second.messages[0], /Узнавали цену<\/b> · Тула · 27 000 ₽/);
  assert.match(second.messages[0], /Новый заказ<\/b> · Киров · Мойка окон\n29\.10 в 10:00 · 13 000 ₽/);

  withNew[1] = { ...withNew[1], summary: "Мойка окон - выполнен и оплачен" };
  const third = buildNotifications(second.next, data(withNew, "2026-10-29T18:00:00Z"));
  assert.equal(third.messages.length, 2);
  assert.match(third.messages[0], /Выполнен<\/b> · Киров/);
  assert.match(third.messages[1], /Достижения «Вершины» открыты/);
  assert.equal(buildNotifications(third.next, data(withNew, "2026-10-29T18:10:00Z")).messages.length, 0);
});

test("Команды и сводка", () => {
  assert.deepEqual(parseCommand("/start@vershina_bot 1234"), { command: "start", argument: "1234" });
  assert.equal(parseCommand("привет"), null);
  assert.match(achievementsSummary(computeAchievements({ events: [], now: new Date("2026-10-27T10:00:00Z") })), /пока закрыты/);
});
