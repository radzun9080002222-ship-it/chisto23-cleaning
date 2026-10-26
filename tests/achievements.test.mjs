import test from "node:test";
import assert from "node:assert/strict";
import { computeAchievements, parseCalendar, parseSheet, normalizeCity } from "../supabase/functions/_shared/achievements.ts";

// Синтетические события в формате калькулятора, без реальных клиентов.
const event = (id, start, summary, description, location = "", timeZone = "Europe/Moscow") => ({
  id, summary, description, location, created: `${start.slice(0, 10)}T06:00:00Z`, start: { dateTime: start, timeZone },
});
const order = (city, extra = "") => `Расчёт стоимости уборки «Вершина»\n\n• Генеральная уборка, 40 м² × 250 ₽ — 10 000 ₽\n• Стандартная створка × 6 — 3 000 ₽\n\nЦЕНА ДЛЯ КЛИЕНТА: 13 000 ₽\nРасходы: 8 000 ₽\nЧистая прибыль: 5 000 ₽\n\nДанные клиента:\nГород: ${city}\nТелефон: +79990000000\n${extra}`;
const inquiry = (city, total = "9 000") => `Статистика конверсий: узнавали цену\n\nИТОГО: ${total} ₽\n\nДанные клиента:\nГород: ${city}`;

const history = [
  event("e1", "2026-08-04T15:00:00+03:00", "Генеральная уборка, 40 м² - выполнен и оплачен", order("Сочи", "Дополнительно: найти таракана")),
  event("e2", "2026-09-05T08:00:00+03:00", "Генеральная уборка, 40 м² - выполнен и оплачен", order("Н. Уренгой"), "Новый Уренгой", "Asia/Yekaterinburg"),
  event("e3", "2026-09-12T10:00:00+03:00", "Генеральная уборка, 40 м² - отменен, клиент не открыл дверь", order("Салехард")),
  event("e4", "2026-09-03T11:00:00+03:00", "Узнавали цену — Сочи, 30000 м²", inquiry("Сочи", "9 000 000")),
  event("e5", "2026-10-05T13:00:00+03:00", "Генеральная уборка - выполнен и оплачен", order("Москва"), "Москва, Балашиха, ул. Пример 1"),
  event("e6", "2026-10-26T19:00:00+03:00", "На подтверждение: Ждём подтверждения · Киров · 16 000 ₽", "Следующий контакт — заказ ещё не подтверждён\nГород: Киров"),
];

test("Календарь: статусы, город, деньги и створки", () => {
  const { orders, inquiries } = parseCalendar(history);
  assert.equal(inquiries.length, 1);
  assert.equal(orders.length, 4);
  const [sochi, urengoy, salekhard, balashikha] = orders;
  assert.equal(sochi.status, "done");
  assert.equal(sochi.revenue, 13000);
  assert.equal(sochi.cost, 8000);
  assert.equal(sochi.windows, 6);
  assert.equal(urengoy.city, "Новый Уренгой");
  assert.equal(urengoy.localHour, 10);
  assert.equal(salekhard.status, "cancelled");
  assert.equal(balashikha.city, "Балашиха");
  assert.equal(normalizeCity("Не определен"), null);
});

test("До первого заказа после запуска всё закрыто и без цифр", () => {
  const result = computeAchievements({ events: history, now: new Date("2026-10-27T09:00:00Z") });
  assert.equal(result.revealed, false);
  assert.equal(result.achievements.filter((item) => item.done).length, 0);
  assert.ok(result.achievements.every((item) => item.progress === null && item.date === null));
  assert.equal(result.stats, null);
  assert.ok(result.cities.every((city) => city.level === 0 && city.orders === 0));
});

test("Запланированный заказ после запуска ещё не открывает ачивки", () => {
  const planned = [...history, event("e7", "2026-10-29T10:00:00+03:00", "Мойка окон", order("Киров"))];
  assert.equal(computeAchievements({ events: planned, now: new Date("2026-10-28T09:00:00Z") }).revealed, false);
});

test("Первый выполненный заказ после запуска открывает всю историю", () => {
  const events = [...history, event("e7", "2026-10-29T10:00:00+03:00", "Мойка окон - выполнен и оплачен", order("Киров"))];
  const result = computeAchievements({ events, now: new Date("2026-10-29T18:00:00Z") });
  const byId = Object.fromEntries(result.achievements.map((item) => [item.id, item]));
  assert.equal(result.revealed, true);
  assert.deepEqual(result.revealedBy, { id: "e7", city: "Киров", date: "2026-10-29" });
  assert.equal(byId["first-order"].date, "2026-08-04");
  assert.equal(byId["outside-msk"].date, "2026-09-05");
  assert.equal(byId["moscow-region"].date, "2026-10-05");
  assert.equal(byId["secret-cockroach"].done, true);
  assert.equal(byId["secret-dream"].done, true);
  assert.equal(byId["secret-door"].done, true);
  assert.equal(byId["polar"].done, false, "отменённый заказ в Салехарде не считается");
  assert.equal(result.stats.orders, 4);
  assert.equal(result.moneySource, "календарь");
});

test("Таблица: заказы склеиваются по названию и городу, реклама и домены отдельно", () => {
  const rows = [
    ["", "Город", "Дата", "Приход", "Расход", "Направление", "Комментарий"],
    ["Генеральная 28 м² (Клиент)", "Тула", "05.10.2026", "7 000,00", "", "", "Аванс от клиента"],
    ["Яндекс реклама Тула", "", "16.09.2026", "", "-18 300,00", "Инвестиции", "Оплата Яндекс Директ"],
    ["Генеральная 28 м² (Клиент)", "Тула", "06.10.2026", "7 000,00", "", "", "Остаток"],
    ["", "Тула", "06.10.2026", "", "-11 500,00", "Операционные", "Оплата клинеру"],
    ["Фото объектов", "Тула", "17.10.2026", "", "-1 000,00", "Операционные", ""],
    ["Домен", "Киров", "22.10.2026", "", "-169,00", "Инвестиции", "Рег.РУ, домен для Кирова"],
    ["Кешбэк", "", "07.09.2026", "6 000,00", "", "", "Кешбэк за Яндекс"],
    ["Итого:", "", "", "", "", "", ""],
  ];
  const sheet = parseSheet(rows);
  assert.equal(sheet.orders.length, 1);
  assert.deepEqual(sheet.orders[0], { name: "Генеральная 28 м² (Клиент)", city: "Тула", date: "2026-10-06", revenue: 14000, cost: 11500 });
  assert.deepEqual(sheet.ads, [{ city: "Тула", date: "2026-09-16" }]);
  assert.equal(sheet.cityExtra["Тула"], 1000);
  assert.equal(sheet.domains.length, 1);
  assert.equal(sheet.cashback, 6000);
});
