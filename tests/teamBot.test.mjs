import test from "node:test";
import assert from "node:assert/strict";
import { computeAchievements, parseCalendar } from "../supabase/functions/_shared/achievements.ts";
import { buildNotifications, emptyState, parseCommand, achievementsSummary } from "../supabase/functions/_shared/teamBot.ts";

const event = (id, start, summary, description) => ({ id, summary, description, created: `${start.slice(0, 10)}T06:00:00Z`, start: { dateTime: start, timeZone: "Europe/Moscow" } });
const order = (city) => `Расчёт стоимости уборки «Вершина»\n\n• Генеральная уборка, 40 м² × 250 ₽ — 10 000 ₽\nЦЕНА ДЛЯ КЛИЕНТА: 13 000 ₽\nРасходы: 8 000 ₽\n\nДанные клиента:\nГород: ${city}`;
const data = (events, now) => { const { orders, inquiries } = parseCalendar(events); return { orders, inquiries, achievements: computeAchievements({ events, now: new Date(now) }) }; };

const ach = (id, name, done = true, hidden = false) => ({ id, cat: "Заказы", name, desc: `описание «${name}»`, tier: "bronze", glyph: "star", src: "календарь", hidden, done, date: null, progress: null, money: false, note: null, rarity: null });
const result = (achievements, revealed = true) => ({ revealed, launchAt: "2026-10-27T00:00:00+03:00", revealedBy: null, moneySource: "календарь", achievements, cities: [], stats: null, msk: [], generatedAt: "2026-10-29T18:00:00.000Z" });

test("Первая проверка молчит, дальше — открытие кубка, но без заказов и запросов цены", () => {
  const base = [event("a", "2026-08-04T10:00:00+03:00", "Генеральная уборка, 40 м² - выполнен и оплачен", order("Сочи"))];
  const first = buildNotifications(emptyState(), data(base, "2026-10-27T10:00:00Z"));
  assert.deepEqual(first.messages, []);

  const withNew = [...base,
    event("b", "2026-10-29T10:00:00+03:00", "Мойка окон", order("Киров")),
    event("q", "2026-10-27T12:00:00+03:00", "Узнавали цену — Тула, 60 м²", "Статистика конверсий: узнавали цену\n\nИТОГО: 27 000 ₽\n\nДанные клиента:\nГород: Тула")];
  const second = buildNotifications(first.next, data(withNew, "2026-10-27T12:00:00Z"));
  assert.deepEqual(second.messages, [], "новый заказ и «узнавали цену» не должны приходить в чат");

  withNew[1] = { ...withNew[1], summary: "Мойка окон - выполнен и оплачен" };
  const third = buildNotifications(second.next, data(withNew, "2026-10-29T18:00:00Z"));
  assert.equal(third.messages.length, 1);
  assert.match(third.messages[0], /Достижения «Вершины» открыты/);
  assert.doesNotMatch(third.messages[0], /Выполнен|Новый заказ|Узнавали цену/);
  assert.equal(buildNotifications(third.next, data(withNew, "2026-10-29T18:10:00Z")).messages.length, 0);
});

test("В чат попадают только ачивки, даже если рядом лежат заказы и запросы цены", () => {
  const state = { initialized: true, revealed: true, achievements: ["a"] };
  const notifications = buildNotifications(state, {
    achievements: result([ach("a", "Первый заказ"), ach("b", "Пять заказов")]),
    orders: [{ id: "o1", city: "Киров", title: "Мойка окон", date: "2026-10-29", time: "10:00", status: "planned", revenue: 13000 }],
    inquiries: [{ id: "q1", city: "Тула", total: 27000 }],
  });
  assert.equal(notifications.messages.length, 1);
  assert.match(notifications.messages[0], /Новое достижение: Пять заказов/);
  assert.doesNotMatch(notifications.messages[0], /Новый заказ|Узнавали цену|Выполнен|Отмена/);
  assert.deepEqual(notifications.next.achievements, ["a", "b"]);
});

test("Несколько новых ачивок — одно сообщение-список, повторов нет", () => {
  const notifications = buildNotifications(
    { initialized: true, revealed: true, achievements: ["a"] },
    { achievements: result([ach("a", "Первый заказ"), ach("b", "Пять заказов"), ach("c", "Десять заказов")]) },
  );
  assert.equal(notifications.messages.length, 1);
  assert.match(notifications.messages[0], /Новые достижения: 2/);
  assert.deepEqual(buildNotifications(notifications.next, { achievements: result([ach("a", "Первый заказ"), ach("b", "Пять заказов"), ach("c", "Десять заказов")]) }).messages, []);
});

test("Команды и сводка", () => {
  assert.deepEqual(parseCommand("/start@vershina_bot 1234"), { command: "start", argument: "1234" });
  assert.equal(parseCommand("привет"), null);
  assert.match(achievementsSummary(computeAchievements({ events: [], now: new Date("2026-10-27T10:00:00Z") })), /пока закрыты/);
});
