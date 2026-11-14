import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import "./report.css";

const REPORT_PIN = "3715";
const ACCESS_KEY = "chisto23_report_pin";

type Week = {
  n: number;
  start: string;
  end: string;
  partial: boolean;
  inquiries: number;
  orders: number;
  done: number;
  cancelled: number;
  planned: number;
  unknown: number;
  top: string;
  fresh: string;
  why: string;
};

const WEEKS: Week[] = [
  { n: 1, start: "2026-08-31", end: "2026-09-06", partial: false, inquiries: 5, orders: 2, done: 2, cancelled: 0, planned: 0, unknown: 0, top: "Сочи 4, Новый Уренгой 2, Липецк 1", fresh: "Сочи, Новый Уренгой, Липецк", why: "Учёт «Узнавали цену» начался 3 сентября. В календаре только Сочи, Новый Уренгой и Липецк. Семь августовских заказов до 31 августа в график звонков не входят." },
  { n: 2, start: "2026-09-07", end: "2026-09-13", partial: false, inquiries: 7, orders: 9, done: 5, cancelled: 4, planned: 0, unknown: 0, top: "Липецк 6, Сочи 3, Воронеж 3, Новый Уренгой 3, Салехард 1", fresh: "Воронеж, Салехард", why: "Звонков на 9 больше. Впервые Воронеж и Салехард. Доля заказов 56% — самая высокая, но заказов всего девять. Четыре отмены разошлись по Липецку, Новому Уренгою, Сочи и Воронежу." },
  { n: 3, start: "2026-09-14", end: "2026-09-20", partial: false, inquiries: 13, orders: 9, done: 6, cancelled: 2, planned: 1, unknown: 0, top: "Воронеж 6, Сочи 5, Рязань 5, Тула 2, Липецк 2", fresh: "Рязань, Тула", why: "Впервые Рязань и Тула. Две отмены — Тула и Липецк. Один заказ в Липецке записан на 25 ноября и ещё не наступил, поэтому выполнение 67% не означает срыв." },
  { n: 4, start: "2026-09-21", end: "2026-09-27", partial: false, inquiries: 15, orders: 9, done: 5, cancelled: 4, planned: 0, unknown: 0, top: "Тула 10, Сочи 5, Рязань 4, Липецк 3, Воронеж 2", fresh: "", why: "Тула дала 10 из 24 обращений. Четыре отмены: две в Туле и две в Воронеже. Все девять заказов уже закрыты." },
  { n: 5, start: "2026-09-28", end: "2026-10-04", partial: false, inquiries: 18, orders: 10, done: 9, cancelled: 1, planned: 0, unknown: 0, top: "Казань 10, Воронеж 4, Рязань 4, Волгоград 3", fresh: "Казань, Волгоград, Балашиха", why: "Впервые Казань, Волгоград и Балашиха. Единственная отмена — Воронеж, клиент не открыл дверь. Выполнено 9 из 10." },
  { n: 6, start: "2026-10-05", end: "2026-10-11", partial: false, inquiries: 19, orders: 9, done: 9, cancelled: 0, planned: 0, unknown: 3, top: "Рязань 5, Тула 4, Волгоград 4, Балашиха 4, Сочи 4", fresh: "", why: "Объём тот же, 28 звонков. Новых городов нет. Все 9 заказов выполнены. Три вопроса записаны как «Не определён»." },
  { n: 7, start: "2026-10-12", end: "2026-10-18", partial: false, inquiries: 34, orders: 14, done: 11, cancelled: 3, planned: 0, unknown: 3, top: "Липецк 8, Балашиха 7, Калуга 6, Волгоград 5, Воронеж 5", fresh: "Калуга", why: "Плюс 20 звонков. Появилась Калуга: 6 обращений и 1 заказ. Волгоград дал 5 вопросов о цене и ни одного заказа, поэтому доля заказов опустилась к 29%." },
  { n: 8, start: "2026-10-19", end: "2026-10-25", partial: false, inquiries: 21, orders: 13, done: 11, cancelled: 2, planned: 0, unknown: 1, top: "Липецк 5, Рязань 5, Воронеж 5, Балашиха 4, Киров 4", fresh: "Киров", why: "После всплеска звонков меньше на 14, доля заказов вернулась к 38%. Впервые Киров: 4 обращения и 3 заказа." },
  { n: 9, start: "2026-10-26", end: "2026-11-01", partial: false, inquiries: 34, orders: 17, done: 14, cancelled: 2, planned: 1, unknown: 4, top: "Чебоксары 9, Сочи 7, Киров 6, Тверь 5", fresh: "Чебоксары, Тверь", why: "Пик звонков: 51. Впервые Чебоксары и Тверь. Доля заказов осталась около трети. Химчистка в Чебоксарах на 9 ноября всё ещё без итоговой пометки." },
  { n: 10, start: "2026-11-02", end: "2026-11-08", partial: false, inquiries: 27, orders: 13, done: 8, cancelled: 5, planned: 0, unknown: 2, top: "Киров 5, Тверь 5, Липецк 5, Воронеж 4, Тула 4, Ставрополь 3", fresh: "Ставрополь, Пенза, Москва", why: "Звонков меньше на 11. Пять отмен клиента: Тверь, Воронеж, Тула, Калуга и Липецк. Все 13 заказов уже закрыты, это отказы, а не будущие уборки." },
  { n: 11, start: "2026-11-09", end: "2026-11-15", partial: true, inquiries: 38, orders: 12, done: 5, cancelled: 3, planned: 4, unknown: 14, top: "Не определён 14, Воронеж 4, Тула 4, Ставрополь 4, Курск 3", fresh: "Курск, Йошкар-Ола", why: "За 6 дней уже 50 звонков. 14 вопросов записаны как «Не определён», поэтому доля заказов выглядит как 24%. По городам она 33%: 12 из 36. Выполнение сравнивать рано: часть уборок ещё впереди." },
];

const CASH: Array<{ label: string; week: number | null; revenue: number; cleaners: number; net: number }> = [
  { label: "3 авг", week: null, revenue: 100000, cleaners: 52000, net: 48000 },
  { label: "10 авг", week: null, revenue: 0, cleaners: 0, net: 0 },
  { label: "17 авг", week: null, revenue: 14200, cleaners: 9000, net: 5200 },
  { label: "24 авг", week: null, revenue: 87260, cleaners: 62500, net: 24760 },
  { label: "Н1", week: 1, revenue: 12000, cleaners: 8000, net: 4000 },
  { label: "Н2", week: 2, revenue: 50400, cleaners: 40500, net: 9900 },
  { label: "Н3", week: 3, revenue: 71200, cleaners: 44800, net: 26400 },
  { label: "Н4", week: 4, revenue: 79600, cleaners: 52900, net: 26700 },
  { label: "Н5", week: 5, revenue: 136225, cleaners: 96450, net: 39775 },
  { label: "Н6", week: 6, revenue: 187800, cleaners: 134800, net: 53000 },
  { label: "Н7", week: 7, revenue: 115250, cleaners: 83002.5, net: 32247.5 },
  { label: "Н8", week: 8, revenue: 291300, cleaners: 193900, net: 97400 },
  { label: "Н9", week: 9, revenue: 188764, cleaners: 128182, net: 60582 },
  { label: "Н10", week: 10, revenue: 242800, cleaners: 162400, net: 80400 },
  { label: "Н11", week: 11, revenue: 108500, cleaners: 65900, net: 42600 },
];

const CITIES: Array<[string, number, number, number, number]> = [
  ["Сочи", 43, 17, 16, 1],
  ["Рязань", 38, 14, 10, 4],
  ["Воронеж", 37, 11, 4, 7],
  ["Липецк", 36, 17, 13, 3],
  ["Тула", 30, 13, 7, 5],
  ["Не определён", 27, 0, 0, 0],
  ["Волгоград", 21, 8, 8, 0],
  ["Казань", 18, 6, 6, 0],
  ["Балашиха", 18, 6, 5, 1],
  ["Киров", 16, 7, 6, 1],
  ["Чебоксары", 14, 5, 4, 0],
  ["Новый Уренгой", 13, 4, 3, 1],
  ["Тверь", 12, 3, 1, 2],
  ["Калуга", 11, 2, 1, 1],
  ["Ставрополь", 7, 2, 2, 0],
  ["Салехард", 5, 4, 4, 0],
  ["Курск", 3, 2, 2, 0],
];

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const callsOf = (week: Week) => week.inquiries + week.orders;
const share = (part: number, whole: number) => (whole ? Math.round((1000 * part) / whole) / 10 : 0);
const pct = (value: number) => `${value.toLocaleString("ru-RU")}%`;
const rub = (value: number) => {
  const abs = Math.abs(value);
  const text = abs.toLocaleString("ru-RU", { minimumFractionDigits: Number.isInteger(abs) ? 0 : 2, maximumFractionDigits: 2 });
  return `${value < 0 ? "−" : ""}${text} ₽`;
};
const ru = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
};
const span = (week: Week) => `${ru(week.start)} – ${ru(week.end)}`;

const callsSum = WEEKS.reduce((sum, week) => sum + callsOf(week), 0);
const ordersSum = WEEKS.reduce((sum, week) => sum + week.orders, 0);
const doneSum = WEEKS.reduce((sum, week) => sum + week.done, 0);
const cancelSum = WEEKS.reduce((sum, week) => sum + week.cancelled, 0);
const revenueSum = CASH.reduce((sum, item) => sum + item.revenue, 0);
const netSum = CASH.reduce((sum, item) => sum + item.net, 0);

function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pin !== REPORT_PIN) {
      setPin("");
      setError(true);
      return;
    }
    sessionStorage.setItem(ACCESS_KEY, pin);
    onUnlock(pin);
  };
  return (
    <main className="manager-lock">
      <form onSubmit={submit} className="manager-lock-card">
        <div className="manager-lock-icon"><LockKeyhole size={28} /></div>
        <span className="manager-eyebrow">Закрытая страница</span>
        <h1>Отчёт Вершины</h1>
        <p>Введите четырёхзначный PIN-код</p>
        <label htmlFor="report-pin">PIN-код</label>
        <input id="report-pin" autoFocus type="password" inputMode="numeric" maxLength={4} value={pin} aria-invalid={error} onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(false); }} />
        {error && <div className="manager-form-error">Неверный PIN-код</div>}
        <button className="manager-primary" type="submit" disabled={pin.length !== 4}>Открыть отчёт</button>
      </form>
    </main>
  );
}

function ReportBody() {
  const [weekN, setWeekN] = useState(11);
  const week = WEEKS.find((item) => item.n === weekN) ?? WEEKS[WEEKS.length - 1];
  const cash = CASH.find((item) => item.week === week.n) ?? CASH[CASH.length - 1];
  const cashIndex = CASH.findIndex((item) => item.week === week.n);
  const prevCash = cashIndex > 0 ? CASH[cashIndex - 1] : null;
  const total = callsOf(week);
  const named = total - week.unknown;

  return (
    <main className="vr-report">
      <div className="vr-wrap">
        <h1>Звонки и выручка по неделям</h1>
        <p className="vr-lead">С 3 сентября по 14 ноября 2026. Звонок — заказ или «Узнавали цену» из календаря. Деньги — лист «Реестр» таблицы «Вершина деятельность» по дате платежа: оплаты клиентов минус оплаты клинеров, включая корректировки.</p>

        <div className="vr-stats">
          <div className="vr-stat"><b>{callsSum}</b><span>звонков за 11 недель</span></div>
          <div className="vr-stat"><b>{pct(share(ordersSum, callsSum))}</b><span>стали заказами</span></div>
          <div className="vr-stat good"><b>{pct(share(doneSum, ordersSum))}</b><span>заказов выполнено</span></div>
          <div className="vr-stat bad"><b>{pct(share(cancelSum, ordersSum))}</b><span>отмен по заказам</span></div>
        </div>
        <div className="vr-callout">
          По таблице клиенты заплатили {rub(revenueSum)}, клинерам ушло {rub(revenueSum - netSum)}, осталось {rub(netSum)}. До 31 августа, до учёта звонков, после клинеров уже осталось 77 960 ₽. Самая денежная неделя — 19–25 октября, 97 400 ₽. Доля заказов держится около трети. Воронеж отменил 7 заказов из 11, Тула — 5 из 13.
        </div>

        <section className="vr-card">
          <div className="vr-pills">
            {WEEKS.map((item) => (
              <button key={item.n} type="button" className={item.n === week.n ? "on" : ""} onClick={() => setWeekN(item.n)}>Н{item.n}</button>
            ))}
          </div>
          <h3>Неделя {week.n} · {span(week)}{week.partial ? " · ещё идёт" : ""}</h3>
          <div className="vr-stats">
            <div className="vr-stat"><b>{total}</b><span>1. Звонки: заказы + узнавали цену</span></div>
            <div className="vr-stat"><b>{pct(share(week.orders, total))}</b><span>2. Из них стали заказами</span></div>
            <div className="vr-stat good"><b>{pct(share(week.done, week.orders))}</b><span>3. Заказов выполнено</span></div>
            <div className="vr-stat bad"><b>{pct(share(week.cancelled, week.orders))}</b><span>4. Отмен по заказам</span></div>
          </div>
          <p className="vr-note">{week.orders} заказов · {week.inquiries} узнавали цену · выполнено {week.done} · отменено {week.cancelled} · открыто {week.planned}{week.unknown ? ` · без города ${week.unknown}` : ""}{week.unknown ? `. По городам доля заказов ${pct(share(week.orders, named))}.` : ""}</p>
          <div className="vr-stats">
            <div className="vr-stat"><b>{rub(cash.revenue)}</b><span>Клиенты заплатили</span></div>
            <div className="vr-stat"><b>{rub(cash.cleaners)}</b><span>Ушло клинерам</span></div>
            <div className="vr-stat good"><b>{rub(cash.net)}</b><span>Выручка минус клинеры</span></div>
          </div>
          <div className="vr-meter" aria-hidden="true">
            <i style={{ width: `${cash.revenue ? (cash.cleaners / cash.revenue) * 100 : 0}%`, background: "#e0a106" }} />
            <i style={{ width: `${cash.revenue ? (cash.net / cash.revenue) * 100 : 0}%`, background: "#12806c" }} />
          </div>
          <p className="vr-note">Касса этой недели по дате платежа.{prevCash ? ` К предыдущей неделе: ${cash.net - prevCash.net >= 0 ? "+" : "−"}${rub(Math.abs(cash.net - prevCash.net))}.` : ""}</p>
          <p>{week.why}</p>
          <p className="vr-note">Города: {week.top}.{week.fresh ? ` Впервые: ${week.fresh}.` : " Новых городов нет."}</p>
        </section>

        <h2>Сколько звонков приходило</h2>
        <p className="vr-legend"><span><i style={{ background: "#12806c" }} />Заказы</span><span><i style={{ background: "#8ec9be" }} />Узнавали цену</span></p>
        <div className="vr-bars">
          {WEEKS.map((item) => {
            const height = callsOf(item) / 51;
            return (
              <button key={item.n} type="button" className={item.n === week.n ? "on" : ""} onClick={() => setWeekN(item.n)}>
                <span className="vr-col-stack">
                  <span style={{ height: `${height * 100}%`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <i style={{ display: "block", height: `${(item.orders / callsOf(item)) * 100}%`, background: "#12806c" }} />
                    <i style={{ display: "block", flex: 1, background: "#8ec9be" }} />
                  </span>
                </span>
                <small>Н{item.n}</small>
              </button>
            );
          })}
        </div>

        <h2>Выручка минус клинеры</h2>
        <p className="vr-legend"><span><i style={{ background: "#12806c" }} />Осталось после клинеров</span></p>
        <div className="vr-bars">
          {CASH.map((item) => (
            item.week == null ? (
              <div className="vr-col" key={item.label}>
                <span className="vr-col-stack"><span style={{ height: `${(item.net / 97400) * 100}%`, background: "#12806c" }} /></span>
                <small>{item.label}</small>
              </div>
            ) : (
              <button key={item.label} type="button" className={item.week === week.n ? "on" : ""} onClick={() => setWeekN(item.week!)}>
                <span className="vr-col-stack"><span style={{ height: `${(item.net / 97400) * 100}%`, background: "#12806c" }} /></span>
                <small>{item.label}</small>
              </button>
            )
          ))}
        </div>
        <p className="vr-note">Первые столбцы — платежи до учёта звонков. 10 августа оплат не было. Н1–Н11 — те же недели, что у звонков, но по дате деньги пришли, а не по дате записи.</p>

        <h2>Все недели</h2>
        <div className="vr-table-wrap">
          <table className="vr-table">
            <thead>
              <tr><th>Неделя</th><th>Период</th><th>Звонки</th><th>Заказы</th><th>Стали заказами</th><th>Выполнено</th><th>Отмены</th><th>Минус клинеры</th></tr>
            </thead>
            <tbody>
              {WEEKS.map((item) => (
                <tr key={item.n} className={item.n === week.n ? "on" : ""}>
                  <td><button type="button" className={item.n === week.n ? "on" : ""} onClick={() => setWeekN(item.n)}>Н{item.n}</button></td>
                  <td>{span(item)}</td>
                  <td>{callsOf(item)}</td>
                  <td>{item.orders}</td>
                  <td>{pct(share(item.orders, callsOf(item)))}</td>
                  <td>{pct(share(item.done, item.orders))}</td>
                  <td>{pct(share(item.cancelled, item.orders))}</td>
                  <td>{rub(CASH.find((row) => row.week === item.n)?.net ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Города</h2>
        <p>Воронеж и Тула держат отмены на длинной дистанции. Волгоград, Казань, Салехард и Курск доводят записанные заказы до выполнения. «Не определён» заказов не даёт.</p>
        <div className="vr-table-wrap">
          <table className="vr-table">
            <thead><tr><th>Город</th><th>Звонки</th><th>Заказы</th><th>Стали заказами</th><th>Выполнено</th><th>Отмены</th></tr></thead>
            <tbody>
              {CITIES.map(([city, callN, orders, done, cancelled]) => (
                <tr key={city}>
                  <td>{city}</td>
                  <td>{callN}</td>
                  <td>{orders}</td>
                  <td>{orders ? pct(share(orders, callN)) : "—"}</td>
                  <td>{orders ? pct(share(done, orders)) : "—"}</td>
                  <td>{orders ? pct(share(cancelled, orders)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Как посчитано</h2>
        <p>Неделя звонков — понедельник–воскресенье по Москве. «Узнавали цену» датируется строкой «Дата обращения». Заказ — строкой «Дата создания», а если событие внесли после уборки, датой самой уборки. Статус читается из заголовка: выполнен, оплачен или закрыт; отмена, не открыл или отказ.</p>
        <p>Деньги взяты из листа «Реестр». Аванс, остаток и корректировка стоят отдельными строками и попадают в неделю своей даты. Реклама, домены, налоги, подписки и дивиденды в разницу не входят. Итог 550 964,50 ₽ совпадает с колонкой «Выручка (клиенты − клинеры)».</p>
      </div>
    </main>
  );
}

export default function Report() {
  const [pin, setPin] = useState(() => (typeof window === "undefined" ? "" : sessionStorage.getItem(ACCESS_KEY) || ""));
  return pin === REPORT_PIN ? <ReportBody /> : <PinGate onUnlock={setPin} />;
}
