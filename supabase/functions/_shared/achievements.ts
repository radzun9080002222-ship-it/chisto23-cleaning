// Достижения «Вершины»: чистый расчёт без сети, общий для Edge Function, тестов и клиента.
// Источники: события Google Календаря (заказы, «узнавали цену», отмены) и строки
// таблицы «Вершина деятельность» (деньги, реклама, домены). Таблица необязательна:
// без неё денежные ачивки считаются по суммам из календаря.
import { CITIES } from "./pricing.ts";

/** Все ачивки закрыты, пока после этого момента не выполнен первый заказ. */
export const ACHIEVEMENTS_LAUNCH_AT = "2026-10-27T00:00:00+03:00";

export type Tier = "bronze" | "silver" | "gold" | "summit";
export type Glyph = "peak" | "pin" | "coin" | "broom" | "building" | "bolt" | "star" | "people" | "eye" | "flag" | "window" | "drop";
export type Source = "календарь" | "таблица" | "вручную";

export type Achievement = {
  id: string;
  cat: string;
  name: string;
  desc: string;
  tier: Tier;
  glyph: Glyph;
  src: Source;
  hidden: boolean;
  done: boolean;
  date: string | null;
  progress: [number, number] | null;
  money: boolean;
  note: string | null;
  rarity: string | null;
};

export type CityProgress = {
  name: string;
  level: number;
  orders: number;
  inquiries: number;
  profit: number;
  ads: number;
  payback: string | null;
  sharedCabinet: boolean;
  booked: string | null;
};

export type AchievementsResult = {
  revealed: boolean;
  launchAt: string;
  revealedBy: { id: string; city: string; date: string } | null;
  moneySource: "таблица" | "календарь";
  achievements: Achievement[];
  cities: CityProgress[];
  stats: { orders: number; revenue: number; profit: number; citiesWithOrders: number; cities: number; area: number; windows: number; inquiries: number } | null;
  msk: { name: string; status: "done" | "ads" | "domain" | "free" }[];
  generatedAt: string;
};

export type CalendarEventInput = {
  id: string;
  status?: string;
  eventType?: string;
  summary?: string;
  description?: string;
  location?: string;
  created?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
};

/* ---------- настройки, которые меняются руками ---------- */

/** Ачивки, которых нет ни в календаре, ни в таблице. Дата или true, если дата неизвестна. */
export const MANUAL_DONE: Record<string, string | true> = {
  "platform-yandex-business": "2026-09-15",
  "platform-promo": "2026-09-17",
  "team-brigadier": true,
  "team-dashboard": "2026-10-22",
};

/** Города, перезапущенные с нуля: дата перезапуска. */
const RESTARTS: Record<string, string> = { "Сочи": "2026-09-01", "Липецк": "2026-10-08" };

/** Куплен домен, но город ещё не запущен. */
const DOMAIN_ONLY = ["Курск", "Ставрополь"];

/** Города 200k+ в московском часовом поясе (черновой список, численность округлённо). */
export const MSK_CITIES = ["Москва", "Санкт-Петербург", "Казань", "Нижний Новгород", "Ростов-на-Дону", "Краснодар", "Воронеж", "Волгоград", "Махачкала", "Ярославль", "Ставрополь", "Набережные Челны", "Балашиха", "Рязань", "Пенза", "Липецк", "Тула", "Киров", "Чебоксары", "Курск", "Тверь", "Брянск", "Сочи", "Иваново", "Белгород", "Владимир", "Калуга", "Смоленск", "Грозный", "Архангельск", "Саранск", "Подольск", "Вологда", "Орёл", "Волжский", "Череповец", "Владикавказ", "Мурманск", "Химки", "Тамбов", "Кострома", "Йошкар-Ола", "Новороссийск", "Петрозаводск", "Мытищи", "Нальчик", "Таганрог", "Нижнекамск", "Шахты", "Королёв", "Дзержинск", "Сыктывкар", "Великий Новгород", "Старый Оскол", "Люберцы"];
const MILLION_CITIES = ["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань", "Красноярск", "Нижний Новгород", "Челябинск", "Уфа", "Самара", "Ростов-на-Дону", "Краснодар", "Омск", "Воронеж", "Пермь", "Волгоград"];
const OUTSIDE_MSK_TIME = ["Новый Уренгой", "Салехард"];
const MOSCOW_REGION = ["Балашиха", "Подольск", "Химки", "Мытищи", "Королёв", "Люберцы"];

/** Города сети: все города калькулятора, кроме служебных. */
export const NETWORK_CITIES: string[] = CITIES
  .filter((city) => !["unknown", "abkhazia", "moscow"].includes(city.id))
  .map((city) => city.label);

/* ---------- разбор календаря ---------- */

type OrderStatus = "done" | "cancelled" | "planned";
type ParsedOrder = {
  id: string; city: string; status: OrderStatus; date: string; startAt: string; localHour: number; created: string;
  revenue: number; cost: number; area: number; windows: number; chem: boolean; b2b: boolean;
  abroad: boolean; twoTeams: boolean; sewer: boolean; phone: string; text: string;
};
type ParsedInquiry = { city: string | null; date: string; total: number; area: number };

const toNumber = (value: string) => Number(value.replace(/[\s ]/g, "").replace(",", "."));
const lastNumber = (text: string, pattern: RegExp) => {
  const matches = text.match(new RegExp(pattern.source, "gi"));
  if (!matches) return null;
  const value = matches[matches.length - 1].match(/(\d[\d\s ]*)/g);
  return value ? toNumber(value[value.length - 1]) : null;
};

export function normalizeCity(raw: string | undefined | null, location = ""): string | null {
  const value = (raw || "").trim();
  if (/балаших/i.test(location) || /балаших/i.test(value)) return "Балашиха";
  if (!value || /не определ/i.test(value)) return null;
  if (/уренгой/i.test(value)) return "Новый Уренгой";
  if (/абхаз|сухум/i.test(value)) return "Сочи";
  return value;
}

function eventStart(event: CalendarEventInput) {
  const raw = event.start?.dateTime || (event.start?.date ? `${event.start.date}T12:00:00+03:00` : "");
  if (!raw) return null;
  const at = new Date(raw);
  const zone = event.start?.timeZone || "Europe/Moscow";
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", timeZone: zone }).formatToParts(at);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "00";
  return { at, date: `${part("year")}-${part("month")}-${part("day")}`, hour: Number(part("hour")) };
}

export function parseCalendar(events: CalendarEventInput[]) {
  const orders: ParsedOrder[] = [];
  const inquiries: ParsedInquiry[] = [];
  for (const event of events) {
    if (event.status === "cancelled" || (event.eventType && event.eventType !== "default" && event.eventType !== "DEFAULT")) continue;
    const summary = event.summary || "";
    const description = event.description || "";
    const location = event.location || "";
    const start = eventStart(event);
    if (!start) continue;
    const cityLine = description.match(/Город:\s*([^\n]+)/)?.[1];
    const city = normalizeCity(cityLine || location.split(",")[0], location);
    if (/^\s*узнавали цену/i.test(summary) || description.trimStart().startsWith("Статистика конверсий")) {
      const total = lastNumber(description, /ИТОГО[^:\n]*:\s*\d[\d\s ]*/) || 0;
      const area = Number(description.match(/,\s*(\d+)\s*м²\s*×/)?.[1] || summary.match(/(\d+)\s*м²/)?.[1] || 0);
      inquiries.push({ city, date: start.date, total, area });
      continue;
    }
    if (/^\s*на подтверждение/i.test(summary) || description.trimStart().startsWith("Следующий контакт")) continue;
    if (!/Данные клиента|Расчёт стоимости/.test(description)) continue;
    if (!city) continue;
    const lower = summary.toLowerCase();
    const status: OrderStatus = /выполнен|оплачен|закрыт/.test(lower) && !/отмен/.test(lower)
      ? "done"
      : /отмен|не открыл|отказ/.test(lower) ? "cancelled" : "planned";
    const text = `${summary}\n${description}\n${location}`;
    const paid = lastNumber(description, /(Фактически оплачено|Клиент оплатил)[^\d\n]*\d[\d\s ]*/);
    const priced = lastNumber(description, /ЦЕНА ДЛЯ КЛИЕНТА[^\d\n]*\d[\d\s ]*/i) ?? lastNumber(description, /ИТОГО[^:\n]*:\s*\d[\d\s ]*/);
    const manual = lastNumber(description, /\d[\d\s ]*\s*рублей/);
    const cost = lastNumber(description, /(Расходы?|Оплата клинер\S*|Клинеры)[^\d\n]*\d[\d\s ]*/i) || 0;
    let windows = 0;
    for (const match of description.matchAll(/(Панорамная створка|Стандартная створка|Мини-окно)\s*×\s*(\d+)/g)) windows += Number(match[2]);
    orders.push({
      id: event.id, city, status, date: start.date, startAt: start.at.toISOString(), localHour: start.hour,
      created: (event.created || start.at.toISOString()).slice(0, 10),
      revenue: paid ?? priced ?? manual ?? 0, cost,
      area: Number(summary.match(/(\d+)\s*м²/)?.[1] || description.match(/,\s*(\d+)\s*м²/)?.[1] || 0),
      windows,
      chem: /химчистк/i.test(summary) || /•\s*Химчистка:/.test(description),
      b2b: /стоматолог|автосалон|театр|офис|барбершоп|клиник|салон красоты|магазин|склад|кафе|ресторан|\bООО\b/i.test(text),
      abroad: /сухум|абхаз|гагр|пицунд/i.test(text),
      twoTeams: /2 команды|две команды|две бригады|2 бригады/i.test(text),
      sewer: /канализ/i.test(text),
      phone: (description.match(/Телефон:\s*([+\d][\d\s()\-]{8,})/)?.[1] || "").replace(/\D/g, "").slice(-10),
      text: text.toLowerCase(),
    });
  }
  orders.sort((a, b) => a.startAt.localeCompare(b.startAt));
  inquiries.sort((a, b) => a.date.localeCompare(b.date));
  return { orders, inquiries };
}

/* ---------- разбор таблицы ---------- */

type SheetOrder = { name: string; city: string; date: string; revenue: number; cost: number };
type SheetMoney = {
  orders: SheetOrder[];
  cityExtra: Record<string, number>;
  ads: { city: string | null; date: string }[];
  cashback: number;
  domains: { date: string }[];
  phoneBought: string | null;
};

const sheetDate = (value: string) => {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
};
const findCity = (text: string) => {
  if (/уренгой/i.test(text)) return "Новый Уренгой";
  return NETWORK_CITIES.find((city) => text.toLowerCase().includes(city.toLowerCase().slice(0, Math.max(5, city.length - 2)))) || null;
};

export function parseSheet(rows: string[][]): SheetMoney {
  const result: SheetMoney = { orders: [], cityExtra: {}, ads: [], cashback: 0, domains: [], phoneBought: null };
  const groups = new Map<string, SheetOrder>();
  let current: SheetOrder | null = null;
  for (const raw of rows.slice(1)) {
    const [name = "", city = "", dateText = "", income = "", expense = "", kind = "", comment = ""] = raw.map((cell) => (cell || "").trim());
    if (/^итого/i.test(name)) break;
    const date = sheetDate(dateText);
    const plus = income ? toNumber(income) : 0;
    const minus = expense ? Math.abs(toNumber(expense)) : 0;
    const text = `${name} ${comment}`;
    if (/инвестици/i.test(kind)) {
      if (/яндекс|директ/i.test(text)) result.ads.push({ city: normalizeCity(city) || findCity(text), date });
      if (/домен|рег\.ру/i.test(text)) result.domains.push({ date });
      if (/телефон/i.test(name) && !result.phoneBought) result.phoneBought = date;
      current = null;
      continue;
    }
    if (!city) {
      if (/кешб[эе]к/i.test(name)) result.cashback += plus;
      current = null;
      continue;
    }
    const cityName = normalizeCity(city) || city;
    if (name) {
      const key = `${name}|${cityName}`;
      current = groups.get(key) || null;
      if (!current) {
        current = { name, city: cityName, date, revenue: 0, cost: 0 };
        groups.set(key, current);
      }
    }
    if (!current || current.city !== cityName) continue;
    current.revenue += plus;
    current.cost += minus;
    if (plus && date > current.date) current.date = date;
  }
  for (const order of groups.values()) {
    if (order.revenue > 0) result.orders.push(order);
    else result.cityExtra[order.city] = (result.cityExtra[order.city] || 0) + order.cost;
  }
  result.orders.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/* ---------- расчёт ---------- */

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

export function computeAchievements(input: { events: CalendarEventInput[]; sheetRows?: string[][] | null; now?: Date; launchAt?: string }): AchievementsResult {
  const now = input.now || new Date();
  const launchAt = input.launchAt || ACHIEVEMENTS_LAUNCH_AT;
  const { orders: allOrders, inquiries } = parseCalendar(input.events);
  const done = allOrders.filter((order) => order.status === "done");
  const sheet = input.sheetRows && input.sheetRows.length > 1 ? parseSheet(input.sheetRows) : null;
  const moneySource = sheet ? "таблица" : "календарь";

  const launchMs = Date.parse(launchAt);
  const trigger = done.find((order) => Date.parse(order.startAt) >= launchMs) || null;
  const revealed = Boolean(trigger);

  // Деньги: из таблицы, иначе из календаря.
  const money = sheet ? sheet.orders.map((order) => ({ city: order.city, date: order.date, revenue: order.revenue, cost: order.cost }))
    : done.map((order) => ({ city: order.city, date: order.date, revenue: order.revenue, cost: order.cost }));
  const cityExtra = sheet?.cityExtra || {};
  const revenue = money.reduce((sum, item) => sum + item.revenue, 0);
  const extraTotal = Object.values(cityExtra).reduce((sum, value) => sum + value, 0);
  const profit = revenue - money.reduce((sum, item) => sum + item.cost, 0) - extraTotal;
  const adsList = sheet?.ads || [];
  const adsTotal = adsList.length * 18300;
  const cumulativeDate = (value: (item: typeof money[number]) => number, threshold: number) => {
    let sum = 0;
    for (const item of money) { sum += value(item); if (sum >= threshold) return item.date; }
    return null;
  };
  const maxOrder = Math.max(0, ...money.map((item) => item.revenue));
  const bigOrderDate = (threshold: number) => money.find((item) => item.revenue >= threshold)?.date || null;

  // Города.
  const byCity = (city: string) => done.filter((order) => order.city === city);
  const firstLead = (city: string) => {
    const dates = [...inquiries.filter((item) => item.city === city).map((item) => item.date), ...allOrders.filter((order) => order.city === city).map((order) => order.created)];
    return dates.length ? dates.sort()[0] : null;
  };
  const cityAds = (city: string) => adsList.filter((ad) => ad.city === city).map((ad) => ad.date).sort();
  const cityMoney = (city: string) => {
    const items = money.filter((item) => item.city === city);
    return { items, profit: items.reduce((sum, item) => sum + item.revenue - item.cost, 0) - (cityExtra[city] || 0) };
  };
  const paybackDate = (city: string) => {
    const ads = cityAds(city).length * 18300;
    if (!ads) return null;
    let run = -(cityExtra[city] || 0);
    for (const item of cityMoney(city).items) { run += item.revenue - item.cost; if (run >= ads) return item.date; }
    return null;
  };

  const list: Achievement[] = [];
  const add = (id: string, cat: string, name: string, desc: string, opts: Partial<Achievement> & { date?: string | null; done?: boolean } = {}) => {
    const manual = MANUAL_DONE[id];
    const date = opts.date ?? (typeof manual === "string" ? manual : null);
    const isDone = opts.done ?? (Boolean(date) || manual === true);
    list.push({
      id, cat, name, desc,
      tier: opts.tier || "bronze", glyph: opts.glyph || "star", src: opts.src || "календарь",
      hidden: opts.hidden || false, done: isDone, date: isDone ? date : null,
      progress: isDone ? null : (opts.progress || null), money: opts.money || false,
      note: opts.note || null, rarity: opts.rarity || null,
    });
  };

  const cityRows: CityProgress[] = [];
  for (const city of NETWORK_CITIES) {
    const cityOrders = byCity(city);
    const lead = firstLead(city);
    const ads = cityAds(city).length * 18300;
    const payback = paybackDate(city);
    const stages: [string, string, number, Tier, string | null][] = [
      ["Подножие", "Первая заявка", 0, "bronze", lead],
      ["Базовый лагерь", "Первый выполненный заказ", 1, "bronze", cityOrders[0]?.date || null],
      ["Перевал", "10 выполненных заказов", 10, "silver", cityOrders[9]?.date || null],
      ["Восьмитысячник", "100 выполненных заказов", 100, "gold", cityOrders[99]?.date || null],
      ["Вершина", "1000 выполненных заказов", 1000, "summit", cityOrders[999]?.date || null],
    ];
    stages.forEach(([stage, desc, goal, tier, date], index) => add(`city-${city}-${index}`, "Восхождение", `${city}: ${stage}`, desc, {
      tier, glyph: "peak", date, progress: goal > 1 ? [cityOrders.length, goal] : null,
    }));
    if (ads) add(`city-${city}-payback`, "Восхождение", `${city}: Окупился`, "Прибыль города перекрыла вложения в его рекламу", {
      tier: "silver", glyph: "coin", src: "таблица", date: payback, progress: [Math.max(0, Math.round(cityMoney(city).profit)), ads], money: true,
    });
    const booked = allOrders.find((order) => order.city === city && order.status === "planned" && Date.parse(order.startAt) > now.getTime());
    cityRows.push({
      name: city, level: stages.filter((stage) => stage[4]).length, orders: cityOrders.length,
      inquiries: inquiries.filter((item) => item.city === city).length, profit: Math.round(cityMoney(city).profit),
      ads, payback, sharedCabinet: !ads && cityOrders.length > 0, booked: booked ? booked.date : null,
    });
  }

  // Экспансия.
  const cityFirsts = NETWORK_CITIES.map((city) => byCity(city)[0]?.date).filter((date): date is string => Boolean(date)).sort();
  const X = "Экспансия";
  add("first-order", X, "Первая уборка", "Самый первый выполненный заказ компании", { glyph: "flag", date: done[0]?.date || null });
  ([[3, "bronze"], [5, "silver"], [10, "gold"], [25, "gold"], [50, "summit"]] as [number, Tier][]).forEach(([count, tier]) =>
    add(`net-${count}`, X, `Сеть из ${count} городов`, `Выполненные заказы в ${count} разных городах`, { tier, glyph: "pin", date: cityFirsts[count - 1] || null, progress: [cityFirsts.length, count] }));
  const mskDone = MSK_CITIES.filter((city) => byCity(city).length);
  const mskDates = mskDone.map((city) => byCity(city)[0].date).sort();
  ([[10, "Московское время", "silver"], [25, "Часовой пояс наш", "gold"], [MSK_CITIES.length, "Всё московское время", "summit"]] as [number, string, Tier][]).forEach(([count, name, tier]) =>
    add(`msk-${count}`, X, name, `Заказы в ${count} городах 200k+ московского времени`, { tier, glyph: "pin", date: mskDates[count - 1] || null, progress: [mskDone.length, count] }));
  const firstIn = (cities: string[]) => done.find((order) => cities.includes(order.city))?.date || null;
  add("outside-msk", X, "За Уралом", "Заказ в городе вне московского времени", { tier: "silver", glyph: "pin", date: firstIn(OUTSIDE_MSK_TIME) });
  add("polar", X, "Полярный круг", "Заказ в Салехарде, единственном городе прямо на полярном круге", { tier: "gold", glyph: "star", date: firstIn(["Салехард"]) });
  add("abroad", X, "Без границ", "Заказ за пределами России", { tier: "gold", glyph: "flag", date: done.find((order) => order.abroad)?.date || null });
  const millionDates = MILLION_CITIES.map((city) => byCity(city)[0]?.date).filter((date): date is string => Boolean(date)).sort();
  add("million-city", X, "Миллионник", "Заказ в городе-миллионнике", { glyph: "pin", date: millionDates[0] || null });
  add("million-3", X, "Три миллионника", "Заказы в трёх городах-миллионниках", { tier: "silver", glyph: "pin", date: millionDates[2] || null, progress: [millionDates.length, 3] });
  add("resort", X, "Курорт", "Заказ в курортном городе", { glyph: "pin", date: firstIn(["Сочи"]) });
  add("moscow-region", X, "Подмосковье", "Первый заказ в Московской области", { glyph: "pin", date: firstIn(MOSCOW_REGION) });
  add("moscow", X, "Белокаменная", "Первый заказ в Москве", { tier: "gold", glyph: "pin", date: firstIn(["Москва"]) });
  add("spb", X, "Северная столица", "Первый заказ в Санкт-Петербурге", { tier: "gold", glyph: "pin", date: firstIn(["Санкт-Петербург"]) });
  const phoenix = Object.entries(RESTARTS).map(([city, restart]) => byCity(city).find((order) => order.date > restart)?.date).filter((date): date is string => Boolean(date)).sort();
  add("phoenix", X, "Феникс", "Город перезапущен с нуля и снова дал заказ", { tier: "silver", glyph: "bolt", date: phoenix[0] || null, rarity: `${phoenix.length} из ${NETWORK_CITIES.length} городов` });
  if (sheet) {
    // Первая заявка в течение 3 дней после любого пополнения рекламы города.
    const leadsOf = (city: string) => [...inquiries.filter((item) => item.city === city).map((item) => item.date), ...allOrders.filter((order) => order.city === city).map((order) => order.created)].sort();
    const fastLead = (city: string) => {
      for (const ad of cityAds(city)) {
        const lead = leadsOf(city).find((date) => date >= ad);
        if (lead && daysBetween(ad, lead) <= 3) return lead;
      }
      return null;
    };
    const fast = NETWORK_CITIES.filter((city) => fastLead(city));
    const withAds = NETWORK_CITIES.filter((city) => cityAds(city).length).length;
    const fastDates = fast.map((city) => fastLead(city)!).sort();
    add("lightning", X, "Молния", "Первая заявка не позже чем через 3 дня после пополнения рекламы", { tier: "silver", glyph: "bolt", src: "таблица", date: fastDates[0] || null, rarity: `${fast.length} из ${withAds} городов` });
  }
  const secondWind = NETWORK_CITIES.map((city) => { const list = byCity(city); for (let i = 1; i < list.length; i++) if (daysBetween(list[i - 1].date, list[i].date) >= 14) return list[i].date; return null; })
    .filter((date): date is string => Boolean(date)).sort();
  add("second-wind", X, "Второе дыхание", "Город молчал больше двух недель и снова дал заказ", { tier: "silver", glyph: "bolt", date: secondWind[0] || null, rarity: `${secondWind.length} из ${NETWORK_CITIES.length} городов` });

  // Заказы.
  const Z = "Заказы";
  ([[10, "bronze"], [50, "silver"], [100, "silver"], [500, "gold"], [1000, "gold"], [10000, "summit"]] as [number, Tier][]).forEach(([count, tier]) =>
    add(`orders-${count}`, Z, `${count.toLocaleString("ru-RU")} заказов`, `${count.toLocaleString("ru-RU")} выполненных заказов по всей сети`, { tier, glyph: "broom", date: done[count - 1]?.date || null, progress: [done.length, count] }));
  const area = done.reduce((sum, order) => sum + order.area, 0);
  const areaDate = (threshold: number) => { let sum = 0; for (const order of done) { sum += order.area; if (sum >= threshold) return order.date; } return null; };
  ([[1000, "Тысяча квадратов", "bronze"], [10000, "Гектар", "silver"], [100000, "Десять гектаров", "gold"]] as [number, string, Tier][]).forEach(([threshold, name, tier]) =>
    add(`area-${threshold}`, Z, name, `Суммарно убрано ${threshold.toLocaleString("ru-RU")} м²`, { tier, glyph: "broom", date: areaDate(threshold), progress: [area, threshold] }));
  add("inquiries-100", Z, "Просто спросить", "100 расчётов «узнавали цену» в калькуляторе", { glyph: "eye", date: inquiries[99]?.date || null, progress: [inquiries.length, 100] });
  add("inquiries-500", Z, "Очередь у калькулятора", "500 расчётов «узнавали цену»", { tier: "silver", glyph: "eye", date: inquiries[499]?.date || null, progress: [inquiries.length, 500] });

  // Деньги.
  const M = "Деньги";
  ([[1e6, "Первый миллион", "silver"], [1e7, "Десять миллионов", "gold"], [1e8, "Сто миллионов", "summit"]] as [number, string, Tier][]).forEach(([threshold, name, tier]) =>
    add(`revenue-${threshold}`, M, name, `Выручка сети ${(threshold / 1e6).toLocaleString("ru-RU")} млн ₽`, { tier, glyph: "coin", src: "таблица", date: cumulativeDate((item) => item.revenue, threshold), progress: [Math.round(revenue), threshold], money: true }));
  ([[1e5, "Первая сотня", "bronze"], [5e5, "Полмиллиона чистыми", "silver"], [1e6, "Миллион чистыми", "gold"], [1e7, "Десять миллионов чистыми", "summit"]] as [number, string, Tier][]).forEach(([threshold, name, tier]) =>
    add(`profit-${threshold}`, M, name, `Прибыль после оплаты исполнителям ${threshold.toLocaleString("ru-RU")} ₽`, { tier, glyph: "coin", src: "таблица", date: cumulativeDate((item) => item.revenue - item.cost, threshold), progress: [Math.max(0, Math.round(profit)), threshold], money: true }));
  add("big-50k", M, "Крупная рыба", "Заказ от 50 000 ₽", { tier: "silver", glyph: "coin", src: "таблица", date: bigOrderDate(50000), progress: [maxOrder, 50000], money: true });
  add("big-100k", M, "Сто тысяч за раз", "Заказ от 100 000 ₽", { tier: "gold", glyph: "coin", src: "таблица", date: bigOrderDate(100000), progress: [maxOrder, 100000], money: true });
  add("big-500k", M, "Горная вершина", "Заказ от 500 000 ₽", { tier: "summit", glyph: "peak", src: "таблица", date: bigOrderDate(500000), progress: [maxOrder, 500000], money: true });
  const months = new Map<string, { revenue: number; cost: number; minus: boolean; last: string }>();
  for (const item of money) {
    const key = item.date.slice(0, 7);
    const month = months.get(key) || { revenue: 0, cost: 0, minus: false, last: item.date };
    month.revenue += item.revenue; month.cost += item.cost; month.minus ||= item.revenue < item.cost; month.last = item.date;
    months.set(key, month);
  }
  const closedMonths = [...months.entries()].filter(([key]) => key < now.toISOString().slice(0, 7)).sort();
  const monthEnd = (key: string) => { const [y, m] = key.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
  const margin = closedMonths.find(([, value]) => value.revenue && (value.revenue - value.cost) / value.revenue >= 0.3);
  add("margin-30", M, "Маржа 30+", "Месяц с маржой выше 30% по всей сети", { tier: "silver", glyph: "coin", src: "таблица", date: margin ? monthEnd(margin[0]) : null });
  const clean = closedMonths.find(([, value]) => !value.minus);
  add("clean-month", M, "Чистый месяц", "Месяц без единого убыточного заказа", { glyph: "coin", src: "таблица", date: clean ? monthEnd(clean[0]) : null });
  if (sheet) {
    add("ads-x2", M, "Реклама ×2", "Прибыль сети вдвое больше всех вложений в Директ", { tier: "gold", glyph: "coin", src: "таблица", done: adsTotal > 0 && profit >= adsTotal * 2, date: adsTotal > 0 && profit >= adsTotal * 2 ? now.toISOString().slice(0, 10) : null, progress: [Math.round(profit), adsTotal * 2], money: true, note: `Вложено ${adsTotal.toLocaleString("ru-RU")} ₽ в ${adsList.length} кабинетов` });
    add("bonus-300k", M, "Бонусный магнат", "Получено 300 000 ₽ бонусов Яндекса", { tier: "silver", glyph: "coin", src: "таблица", date: adsList[9]?.date || null, progress: [adsList.length * 30000, 300000], money: true });
    let cashbackRun = 0; let cashbackDate: string | null = null;
    for (const row of (input.sheetRows || []).slice(1)) { if (/кешб[эе]к/i.test(row[0] || "")) { cashbackRun += toNumber(row[3] || "0"); if (cashbackRun >= 10000 && !cashbackDate) cashbackDate = sheetDate(row[2] || ""); } }
    add("cashback-10k", M, "Кешбэк-охотник", "Кешбэк Яндекса больше 10 000 ₽", { glyph: "coin", src: "таблица", date: cashbackDate, progress: [Math.round(sheet.cashback), 10000], money: true });
  }

  // Компании.
  const B = "Компании";
  const b2b = done.filter((order) => order.b2b);
  add("b2b-1", B, "Первое юрлицо", "Выполнен заказ для компании", { glyph: "building", date: b2b[0]?.date || null });
  add("b2b-5", B, "Пять компаний", "Заказы от 5 разных организаций", { tier: "silver", glyph: "building", date: b2b[4]?.date || null, progress: [b2b.length, 5] });
  add("contract-1", B, "Абонемент", "Первый договор постоянного обслуживания", { tier: "gold", glyph: "building", src: "вручную", note: "В переговорах: НЛМК, ФосАгро" });
  add("contract-5", B, "Корпорат", "Пять договоров на постоянке", { tier: "gold", glyph: "building", src: "вручную" });
  add("contract-1m", B, "Стабильность", "1 млн ₽ в месяц только с абонементов", { tier: "summit", glyph: "building", src: "вручную" });

  // Мастерство.
  const Q = "Мастерство";
  const typeDates = [/влажн/, /генерал/, /после ремонта/, /вс[её] включено/, /химчистк/, /окн|створк/].map((pattern) => done.find((order) => pattern.test(order.text))?.date || null);
  add("all-services", Q, "Мастер на все руки", "Выполнены все виды услуг: влажная, генеральная, после ремонта, под ключ, химчистка, окна", { tier: "silver", glyph: "star", done: typeDates.every(Boolean), date: typeDates.every(Boolean) ? (typeDates as string[]).sort()[5] : null, progress: [typeDates.filter(Boolean).length, 6] });
  const windows = done.reduce((sum, order) => sum + order.windows, 0);
  const windowDate = (threshold: number) => { let sum = 0; for (const order of done) { sum += order.windows; if (sum >= threshold) return order.date; } return null; };
  ([[100, "Стекольщик", "bronze"], [500, "Хрустальный", "silver"], [1000, "Тысяча окон", "gold"]] as [number, string, Tier][]).forEach(([threshold, name, tier]) =>
    add(`windows-${threshold}`, Q, name, `Вымыто ${threshold.toLocaleString("ru-RU")} створок`, { tier, glyph: "window", date: windowDate(threshold), progress: [windows, threshold] }));
  const chem = done.filter((order) => order.chem);
  add("chem-10", Q, "Химчист", "10 заказов с химчисткой мебели", { glyph: "drop", date: chem[9]?.date || null, progress: [chem.length, 10] });
  add("two-teams", Q, "Десант", "Две бригады на одном объекте", { tier: "silver", glyph: "people", date: done.find((order) => order.twoTeams)?.date || null });
  add("sewer", Q, "Аварийная служба", "Уборка после канализационной аварии", { tier: "silver", glyph: "drop", date: done.find((order) => order.sewer)?.date || null });

  // Рекорды.
  const R = "Рекорды";
  const perDay = new Map<string, ParsedOrder[]>();
  for (const order of done) perDay.set(order.date, [...(perDay.get(order.date) || []), order]);
  const days = [...perDay.keys()].sort();
  const dayWith = (test: (orders: ParsedOrder[]) => boolean) => days.find((day) => test(perDay.get(day)!)) || null;
  const maxPerDay = Math.max(0, ...[...perDay.values()].map((orders) => orders.length));
  const maxCities = Math.max(0, ...[...perDay.values()].map((orders) => new Set(orders.map((order) => order.city)).size));
  add("day-4", R, "Марафон", "4 заказа за один день", { glyph: "bolt", date: dayWith((orders) => orders.length >= 4), progress: [maxPerDay, 4] });
  add("day-7", R, "Супермарафон", "7 заказов за один день", { tier: "gold", glyph: "bolt", date: dayWith((orders) => orders.length >= 7), progress: [maxPerDay, 7] });
  add("cities-3", R, "Три фронта", "Заказы в 3 городах за один день", { glyph: "pin", date: dayWith((orders) => new Set(orders.map((order) => order.city)).size >= 3), progress: [maxCities, 3] });
  add("cities-5", R, "Пять фронтов", "Заказы в 5 городах за один день", { tier: "gold", glyph: "pin", date: dayWith((orders) => new Set(orders.map((order) => order.city)).size >= 5), progress: [maxCities, 5] });
  let streak = 1, best = days.length ? 1 : 0; let streak7: string | null = null, streak30: string | null = null;
  for (let i = 1; i < days.length; i++) {
    streak = daysBetween(days[i - 1], days[i]) === 1 ? streak + 1 : 1;
    best = Math.max(best, streak);
    if (streak >= 7 && !streak7) streak7 = days[i];
    if (streak >= 30 && !streak30) streak30 = days[i];
  }
  add("streak-7", R, "Без выходных", "Заказы 7 дней подряд", { tier: "silver", glyph: "bolt", date: streak7, progress: [best, 7], note: `Рекорд серии: ${best} дн.` });
  add("streak-30", R, "Месяц без выходных", "Заказы 30 дней подряд", { tier: "gold", glyph: "bolt", date: streak30, progress: [best, 30] });
  add("early", R, "Ранняя пташка", "Уборка началась до 8:00", { glyph: "star", date: done.find((order) => order.localHour < 8)?.date || null });
  add("new-year", R, "Новогодний штурм", "Заказ 31 декабря", { tier: "silver", glyph: "star", date: done.find((order) => order.date.slice(5) === "12-31")?.date || null });

  // Площадки и команда — вручную.
  const P = "Площадки";
  add("platform-yandex-business", P, "Яндекс Бизнес", "Карточка организации подключена", { src: "вручную" });
  add("platform-promo", P, "Акция в карточке", "Запущена скидка новым клиентам", { src: "вручную", note: "−10% на первую уборку" });
  add("platform-yandex-all", P, "Яндекс Бизнес везде", "Карточки во всех городах сети", { tier: "gold", src: "вручную" });
  add("platform-maps-ads", P, "Реклама на Картах", "Оплачена реклама в Яндекс Картах", { src: "вручную" });
  for (const [id, name, desc] of [["2gis", "2ГИС", "Профиль «Вершины» в 2ГИС"], ["avito", "Авито", "Профиль «Вершины» на Авито"], ["profi", "Профи.ру", "Профиль на Профи.ру"], ["youdo", "YouDo", "Профиль на YouDo"], ["vk", "ВКонтакте", "Группа «Вершины» во ВКонтакте"], ["tg", "Telegram-канал", "Свой Telegram-канал"]])
    add(`platform-${id}`, P, name, desc, { src: "вручную" });
  add("reviews-1", P, "Пять звёзд", "Первый отзыв 5★", { src: "вручную" });
  add("reviews-50", P, "Народная любовь", "50 отзывов", { tier: "gold", src: "вручную" });
  add("rating-49", P, "Безупречный", "Рейтинг 4.9+ на площадке", { tier: "gold", src: "вручную" });
  const K = "Команда";
  add("team-brigadier", K, "Бригадир", "В команде появился бригадир", { glyph: "people", src: "вручную", note: "сентябрь 2026" });
  add("team-10", K, "Десять рук", "10 постоянных исполнителей", { tier: "silver", glyph: "people", src: "вручную" });
  add("team-50", K, "Армия чистоты", "50 постоянных исполнителей", { tier: "gold", glyph: "people", src: "вручную" });
  const veteranDays = done.length ? daysBetween(done[0].date, now.toISOString().slice(0, 10)) : 0;
  add("team-veteran", K, "Ветеран", "Исполнитель работает с «Вершиной» год", { tier: "gold", glyph: "people", src: "вручную", progress: [Math.min(veteranDays, 365), 365] });
  if (sheet) add("team-phone", K, "Рабочая трубка", "Куплен рабочий телефон", { glyph: "bolt", src: "таблица", date: sheet.phoneBought });
  add("team-dashboard", K, "Пульт управления", "Страница заказов для сотрудников", { tier: "silver", glyph: "window", src: "вручную" });
  add("team-office", K, "Свой угол", "Первый офлайн-офис", { tier: "gold", glyph: "building", src: "вручную" });
  add("team-storage", K, "Склад", "Склад инвентаря и химии", { tier: "silver", glyph: "building", src: "вручную" });
  add("team-uniform", K, "Фирменный цвет", "Униформа с логотипом", { glyph: "people", src: "вручную" });
  add("team-car", K, "На колёсах", "Брендированная машина", { tier: "gold", glyph: "flag", src: "вручную" });
  add("team-app", K, "В кармане", "Приложение «Вершины» в сторе", { tier: "gold", glyph: "bolt", src: "вручную" });
  if (sheet) {
    const domains = sheet.domains.map((item) => item.date).sort();
    add("domains-10", K, "Доменный магнат", "10 доменов под города", { glyph: "flag", src: "таблица", date: domains[9] || null, progress: [domains.length, 10] });
    add("domains-25", K, "Доменная империя", "25 доменов", { tier: "silver", glyph: "flag", src: "таблица", date: domains[24] || null, progress: [domains.length, 25] });
  }

  // Секретные.
  const H = "Секретные";
  const secret = (id: string, name: string, desc: string, date: string | null, tier: Tier = "bronze") => add(id, H, name, desc, { tier, glyph: "eye", hidden: true, date });
  const findText = (pattern: RegExp) => allOrders.find((order) => pattern.test(order.text))?.date || null;
  secret("secret-cockroach", "Охотник", "Найти и убрать таракана", findText(/таракан/));
  secret("secret-champagne", "После праздника", "Оттереть потолок от шампанского", findText(/шампанск/));
  secret("secret-dream", "Мечтать не вредно", "Расчёт в калькуляторе на 5 000 000 ₽ и больше", inquiries.find((item) => item.total >= 5e6)?.date || null, "silver");
  secret("secret-door", "Тук-тук", "Клиент не открыл дверь", findText(/не открыл дверь/));
  secret("secret-hazmat", "Биологическая угроза", "Клиент встретил в химкостюмах", findText(/хим\.? ?костюм/));
  secret("secret-safety", "Техника безопасности", "Отказались от опасного заказа", findText(/пьян|опасно/), "silver");
  secret("secret-1m2", "Квадратный метр", "Кто-то посчитал уборку 1 м²", inquiries.find((item) => item.area === 1)?.date || null);
  secret("secret-night", "Ночная смена", "Уборка, начатая после 22:00", done.find((order) => order.localHour >= 22)?.date || null, "silver");
  const phones = new Map<string, string[]>();
  for (const order of done) if (order.phone) phones.set(order.phone, [...(phones.get(order.phone) || []), order.date]);
  const repeat = [...phones.values()].map((dates) => [...new Set(dates)].sort()).filter((dates) => dates.length > 1).map((dates) => dates[1]).sort();
  secret("secret-repeat", "Двойной удар", "Повторный заказ от того же клиента", repeat[0] || null, "silver");

  const msk = MSK_CITIES.map((name) => ({
    name,
    status: (byCity(name).length ? "done" : NETWORK_CITIES.includes(name) ? "ads" : DOMAIN_ONLY.includes(name) ? "domain" : "free") as "done" | "ads" | "domain" | "free",
  }));

  if (!revealed) {
    return {
      revealed, launchAt, revealedBy: null, moneySource,
      achievements: list.map((item) => ({ ...item, done: false, date: null, progress: null, note: null, rarity: null })),
      cities: cityRows.map((city) => ({ ...city, level: 0, orders: 0, inquiries: 0, profit: 0, payback: null })),
      stats: null, msk: msk.map((item) => ({ ...item, status: "free" as const })), generatedAt: now.toISOString(),
    };
  }
  return {
    revealed, launchAt, revealedBy: { id: trigger!.id, city: trigger!.city, date: trigger!.date }, moneySource,
    achievements: list, cities: cityRows,
    stats: { orders: done.length, revenue: Math.round(revenue), profit: Math.round(profit), citiesWithOrders: cityFirsts.length, cities: NETWORK_CITIES.length, area, windows, inquiries: inquiries.length },
    msk, generatedAt: now.toISOString(),
  };
}
