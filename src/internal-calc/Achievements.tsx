import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Lock, Trophy, X } from "lucide-react";
import { loadAchievements, type Achievement, type AchievementsResult } from "./managerApi";

const SEEN_KEY = "vershina_ach_seen";
const CELEBRATED_KEY = "vershina_ach_celebrated";

const readStore = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStore = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* приватный режим */ } };

export const seenIds = () => new Set<string>(JSON.parse(readStore(SEEN_KEY) || "[]"));
/** Праздничный экран ещё не показывали на этом устройстве. */
export const needsCelebration = (data: AchievementsResult | null) =>
  Boolean(data?.revealed && data.revealedBy && readStore(CELEBRATED_KEY) !== data.revealedBy.id);

export const unseenCount = (data: AchievementsResult | null) => {
  if (!data?.revealed) return 0;
  const seen = seenIds();
  return data.achievements.filter((item) => item.done && !seen.has(item.id)).length;
};

const fmt = (value: number) => Math.round(value).toLocaleString("ru-RU");
const short = (value: number) => value >= 1e6 ? `${(value / 1e6).toFixed(2).replace(".", ",")} млн` : value >= 1e4 ? `${Math.round(value / 1e3)} тыс` : fmt(value);
const fdate = (value: string | null) => value ? value.split("-").reverse().join(".") : "";
const progressText = (item: Achievement) => {
  if (!item.progress) return "";
  const [current, goal] = item.progress;
  return item.money ? `${short(current)} / ${short(goal)} ₽` : `${fmt(current)} / ${fmt(goal)}`;
};
const title = (item: Achievement) => item.hidden && !item.done ? "Секретное достижение" : item.name;
const description = (item: Achievement) => item.hidden && !item.done ? "Откроется, когда случится" : item.desc;

const GLYPHS: Record<string, string> = {
  peak: '<path d="M2 20 L9 6 L13 12.5 L15.5 9 L22 20 Z" fill="currentColor"/><path d="M9 6 L11.3 9.7 L10 9.2 L8.6 10.4 L7.2 9 Z" fill="#fff" opacity=".85"/>',
  pin: '<path fill-rule="evenodd" fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"/>',
  coin: '<text x="12" y="19.5" text-anchor="middle" font-size="20" font-weight="800" fill="currentColor" font-family="Manrope, Arial, sans-serif">₽</text>',
  broom: '<path fill="currentColor" d="M15.2 2.5l1.9.9-4.4 8.4-1.9-.9z"/><path fill="currentColor" d="M8.6 11.2l5.6 2.7-2.1 7.6c-2.8-.3-5.6-1.6-7.9-3.6z"/>',
  building: '<path d="M4 21V5.5L12 3v18M12 21V9l8 3v9M2 21h20M7 8h2M7 12h2M7 16h2M15 14h2M15 17h2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  bolt: '<path fill="currentColor" d="M13.5 2L4 14h6.5L9 22l11-12.5h-6.6z"/>',
  star: '<path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/>',
  people: '<circle cx="8.5" cy="7.5" r="3.2" fill="currentColor"/><circle cx="16.5" cy="8.5" r="2.6" fill="currentColor"/><path fill="currentColor" d="M2.5 20c0-3.6 2.7-6.3 6-6.3s6 2.7 6 6.3zM14.6 20c0-2.2-.6-3.9-1.7-5.2 3.8-.9 8.6 1 8.6 5.2z"/>',
  eye: '<path fill-rule="evenodd" fill="currentColor" d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12zm10.5 3.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2z"/>',
  flag: '<path d="M5 21.5V3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path fill="currentColor" d="M6 3.5h12l-2.6 4.3L18 12H6z"/>',
  window: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M12 3.5v17M3.5 12h17" stroke="currentColor" stroke-width="2.2"/>',
  drop: '<path fill="currentColor" d="M12 2.5s7 7.8 7 12.6a7 7 0 0 1-14 0c0-4.8 7-12.6 7-12.6z"/>',
  lock: '<path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" stroke="currentColor" stroke-width="2.2" fill="none"/><rect x="5" y="11" width="14" height="10" rx="1.5" fill="currentColor"/>',
  q: '<text x="12" y="18" text-anchor="middle" font-size="16" font-weight="800" fill="currentColor" font-family="Manrope, Arial, sans-serif">?</text>',
};

export function BadgeDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="ach-bronze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2ab7d" /><stop offset="1" stopColor="#8a5634" /></linearGradient>
        <linearGradient id="ach-silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef3f7" /><stop offset="1" stopColor="#7d8d9a" /></linearGradient>
        <linearGradient id="ach-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe09a" /><stop offset="1" stopColor="#b07a26" /></linearGradient>
        <linearGradient id="ach-summit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d9f3ff" /><stop offset=".5" stopColor="#7fc6e6" /><stop offset="1" stopColor="#2d6f96" /></linearGradient>
        <linearGradient id="ach-off" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#35485a" /><stop offset="1" stopColor="#1c2833" /></linearGradient>
      </defs>
    </svg>
  );
}

export function Badge({ item, size = 56, style }: { item: Achievement; size?: number; style?: React.CSSProperties }) {
  const on = item.done;
  const glyph = on ? GLYPHS[item.glyph] : item.hidden ? GLYPHS.q : GLYPHS.lock;
  return (
    <svg className="ach-badge" width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={on ? `Получено: ${item.name}` : "Не получено"} style={style}>
      <path d="M28 2 L50.5 15 V41 L28 54 L5.5 41 V15 Z" fill={on ? `url(#ach-${item.tier})` : "url(#ach-off)"} stroke={on ? (item.tier === "summit" ? "#bfe8fb" : "rgba(255,255,255,.35)") : "#2e3f4f"} strokeWidth="1.5" />
      <path d="M28 7 L46 17.4 V38.6 L28 49 L10 38.6 V17.4 Z" fill="none" stroke={on ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.04)"} strokeWidth="1.2" />
      <g transform="translate(16 16)" style={{ color: on ? "#1a2530" : "#6f8394" }} dangerouslySetInnerHTML={{ __html: glyph }} />
    </svg>
  );
}

const STAGES = ["Подножие", "Базовый лагерь", "Перевал", "Восьмитысячник", "Вершина"];
const GOALS = [0, 1, 10, 100, 1000];

function Ridge({ level }: { level: number }) {
  const xs = [14, 70, 128, 186, 244], ys = [50, 42, 33, 22, 10];
  const line = "M0 56 L14 50 L40 46 L70 42 L96 38 L128 33 L150 30 L186 22 L214 17 L244 10 L260 8";
  return (
    <svg className="ach-ridge" viewBox="0 0 260 60" aria-hidden="true">
      <path d={`${line} L260 56 Z`} fill="#223241" />
      <path d={line} fill="none" stroke="#3a5164" strokeWidth="1.5" />
      {xs.map((x, index) => {
        const on = index < level, current = index === level;
        return <circle key={x} cx={x} cy={ys[index]} r={on ? 5.5 : 4.5} fill={on ? (index === 4 ? "#7fc6e6" : "#e4b75c") : "#18242f"} stroke={on ? "#fff" : current ? "#e0a14f" : "#4a6073"} strokeWidth="1.5" className={current ? "ach-pulse" : undefined} />;
      })}
    </svg>
  );
}

const CATS = ["Экспансия", "Заказы", "Деньги", "Компании", "Мастерство", "Рекорды", "Площадки", "Команда", "Секретные", "Восхождение"];

function Celebration({ data, onDone }: { data: AchievementsResult; onDone: () => void }) {
  const unlocked = data.achievements.filter((item) => item.done && item.cat !== "Восхождение");
  const cityStages = data.achievements.filter((item) => item.done && item.cat === "Восхождение").length;
  const shown = unlocked.slice(0, 36);
  return (
    <div className="ach-celebrate" role="dialog" aria-modal="true" aria-labelledby="ach-celebrate-title">
      <div className="ach-celebrate-card">
        <Trophy className="ach-celebrate-icon" size={40} aria-hidden="true" />
        <p className="ach-eyebrow">Достижения открыты</p>
        <h2 id="ach-celebrate-title">+{unlocked.length + cityStages}</h2>
        <p className="ach-celebrate-text">
          Заказ в городе {data.revealedBy?.city} {fdate(data.revealedBy?.date || null)} открыл всё, что «Вершина» накопила с первого заказа:
          {" "}{unlocked.length} достижений и {cityStages} лагерей в городах.
        </p>
        <div className="ach-celebrate-grid">
          {shown.map((item, index) => (
            <span key={item.id} title={item.name} className="ach-pop" style={{ animationDelay: `${index * 45}ms` }}><Badge item={item} size={48} /></span>
          ))}
          {unlocked.length > shown.length && <span className="ach-more">+{unlocked.length - shown.length}</span>}
        </div>
        <button type="button" className="ach-primary" onClick={onDone} autoFocus>Смотреть все</button>
      </div>
    </div>
  );
}

export default function Achievements({ pin, initial, onClose }: { pin: string; initial: AchievementsResult | null; onClose: () => void }) {
  const [data, setData] = useState<AchievementsResult | null>(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initial);
  const [filter, setFilter] = useState<string>(() => readStore("vershina_ach_filter") || "all");
  const [celebrate, setCelebrate] = useState(false);
  const [fresh] = useState(() => seenIds());
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadAchievements(pin).then((result) => { if (!cancelled) setData(result); })
      .catch((failure) => { if (!cancelled && !initial) setError(failure instanceof Error && /Неизвестное действие/.test(failure.message) ? "Достижения ещё не включены на сервере. Нужно обновить функцию manager-calc." : failure instanceof Error ? failure.message : "Не удалось загрузить достижения"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pin]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); };
  }, [onClose]);

  useEffect(() => {
    if (!data?.revealed || !data.revealedBy) return;
    if (readStore(CELEBRATED_KEY) !== data.revealedBy.id) setCelebrate(true);
    writeStore(SEEN_KEY, JSON.stringify(data.achievements.filter((item) => item.done).map((item) => item.id)));
  }, [data]);

  const view = useMemo(() => {
    if (!data) return null;
    const list = data.achievements;
    const done = list.filter((item) => item.done);
    const locked = list.filter((item) => !item.done);
    const dated = done.filter((item) => item.date && item.cat !== "Восхождение").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const near = locked.filter((item) => item.progress && item.progress[0] > 0 && !item.hidden)
      .map((item) => ({ item, ratio: item.progress![0] / item.progress![1] })).sort((a, b) => b.ratio - a.ratio).slice(0, 6);
    return { list, done, locked, latest: dated[0] || null, recent: dated.slice(1, 6), near };
  }, [data]);

  const pick = (value: string) => { setFilter(value); writeStore("vershina_ach_filter", value); };
  const shownList = view ? view.list
    .filter((item) => filter === "all" ? item.cat !== "Восхождение" : filter === "done" ? item.done : filter === "locked" ? !item.done : item.cat === filter)
    .slice().sort((a, b) => Number(b.done) - Number(a.done) || (b.date || "").localeCompare(a.date || "") || ((b.progress ? b.progress[0] / b.progress[1] : 0) - (a.progress ? a.progress[0] / a.progress[1] : 0)))
    : [];
  const count = (key: string) => !view ? 0 : key === "all" ? view.list.filter((item) => item.cat !== "Восхождение").length : key === "done" ? view.done.length : key === "locked" ? view.locked.length : view.list.filter((item) => item.cat === key).length;

  return (
    <div className="ach-overlay">
      <div className="ach-shell" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Достижения Вершины">
        <header className="ach-top">
          <div className="ach-brand">
            <Trophy size={22} aria-hidden="true" />
            <div><h1>Достижения</h1><p>Вся сеть «Вершины»</p></div>
          </div>
          <button type="button" className="ach-close" onClick={onClose} aria-label="Закрыть достижения"><X size={20} /></button>
        </header>

        {loading && !data && <div className="ach-state"><LoaderCircle className="spin" size={22} /> Считаем заказы из календаря…</div>}
        {error && !data && <div className="ach-state ach-error">{error}</div>}

        {data && view && (
          <div className="ach-body">
            <section className="ach-summary">
              <div className="ach-panel">
                <h2 className="ach-label">Достижения</h2>
                <div className="ach-got">Получено <b>{view.done.length}</b> из <b>{view.list.length}</b> <span>({Math.round(view.done.length / view.list.length * 100)}%)</span></div>
                <div className="ach-bar"><i style={{ width: `${view.done.length / view.list.length * 100}%` }} /></div>
                {!data.revealed && (
                  <div className="ach-teaser">
                    <Lock size={18} aria-hidden="true" />
                    <div>
                      <b>Все достижения пока закрыты</b>
                      <p>Первый выполненный заказ после {fdate(data.launchAt.slice(0, 10))} откроет разом всё, что сеть уже заработала. Отметьте заказ в календаре как «выполнен и оплачен».</p>
                    </div>
                  </div>
                )}
                {data.revealed && view.latest && (
                  <div className="ach-latest">
                    <Badge item={view.latest} size={72} />
                    <div><b>{view.latest.name}</b><p>{view.latest.desc}</p><small>Получено {fdate(view.latest.date)}{view.latest.note ? ` · ${view.latest.note}` : ""}</small></div>
                  </div>
                )}
                {data.revealed && <div className="ach-row">{view.recent.map((item) => <span key={item.id} title={item.name}><Badge item={item} /></span>)}<span className="ach-more">+{Math.max(0, view.done.length - 1 - view.recent.length)}</span></div>}
                <div className="ach-sub">Неполученные достижения</div>
                <div className="ach-row">{view.locked.filter((item) => item.cat !== "Восхождение").slice(0, 4).map((item) => <span key={item.id} title={title(item)}><Badge item={item} /></span>)}<span className="ach-more">+{Math.max(0, view.locked.length - 4)}</span></div>
              </div>
              <div className="ach-panel">
                <h2 className="ach-label">{data.revealed ? "Ближе всего" : "Что откроется"}</h2>
                {data.revealed ? (
                  <div className="ach-near">
                    {view.near.map(({ item, ratio }) => (
                      <div key={item.id} className="ach-near-item">
                        <Badge item={item} size={44} />
                        <div><b>{item.name}</b><div className="ach-near-line"><span>{item.desc}</span><span className="ach-num">{progressText(item)}</span></div><div className="ach-mini"><i style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="ach-cats">
                    {CATS.map((cat) => <li key={cat}><span>{cat}</span><b className="ach-num">{view.list.filter((item) => item.cat === cat).length}</b></li>)}
                  </ul>
                )}
              </div>
            </section>

            {data.stats && (
              <section className="ach-stats">
                {([[fmt(data.stats.orders), "выполненных заказов"], [`${short(data.stats.revenue)} ₽`, "выручка"], [`${short(data.stats.profit)} ₽`, "прибыль после исполнителей"], [`${data.stats.citiesWithOrders} из ${data.stats.cities}`, "городов с заказами"], [`${fmt(data.stats.area)} м²`, "убрано"], [fmt(data.stats.windows), "вымытых створок"]] as [string, string][]).map(([value, label]) => (
                  <div key={label}><b>{value}</b><span>{label}</span></div>
                ))}
              </section>
            )}

            <section>
              <div className="ach-head"><h2>Восхождение по городам</h2><p>Пять лагерей у каждого города: первая заявка, первый заказ, 10, 100 и 1000 заказов.</p></div>
              <div className="ach-cities">
                {data.cities.slice().sort((a, b) => b.orders - a.orders || b.inquiries - a.inquiries || a.name.localeCompare(b.name)).map((city) => {
                  const next = city.level >= 5 ? "" : city.level === 0 ? "первая заявка" : city.level === 1 ? (city.booked ? `первый заказ записан на ${fdate(city.booked).slice(0, 5)}` : "первый заказ") : `${city.orders} / ${GOALS[city.level]} до «${STAGES[city.level]}»`;
                  return (
                    <article key={city.name} className="ach-city">
                      <div className="ach-city-head"><h3>{city.name}</h3><span className={city.level ? "" : "none"}>{city.level ? STAGES[city.level - 1] : data.revealed ? "Ждём заявку" : "Закрыто"}</span></div>
                      <Ridge level={city.level} />
                      {data.revealed && <div className="ach-facts"><div><b>{city.orders}</b>заказов</div><div><b>{city.inquiries}</b>расчётов</div><div><b>{city.profit ? short(city.profit) : "—"}</b>прибыль</div></div>}
                      {data.revealed && (
                        <div className="ach-city-foot"><span>{next}</span>
                          {city.sharedCabinet ? <span className="ach-chip">общий кабинет</span> : city.payback ? <span className="ach-chip ok">окупился {fdate(city.payback).slice(0, 5)}</span> : city.ads ? <span className="ach-chip warn">окупаемость {Math.max(0, Math.round(city.profit / city.ads * 100))}%</span> : null}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="ach-head"><h2>Все достижения</h2><p>Описание секретных видно только после получения.</p></div>
              <div className="ach-filters" role="toolbar" aria-label="Фильтр достижений">
                {[["all", "Все"], ["done", "Полученные"], ["locked", "Неполученные"], ...CATS.map((cat) => [cat, cat])].map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={filter === key} onClick={() => pick(key)}>{label}<span>{count(key)}</span></button>
                ))}
              </div>
              <div className="ach-list">
                {shownList.map((item) => (
                  <div key={item.id} className={`ach-item${item.done ? "" : " locked"}`}>
                    <Badge item={item} />
                    <div className="ach-item-text">
                      <b>{title(item)}{item.done && !fresh.has(item.id) && data.revealed && <em className="ach-new">новое</em>}</b>
                      <p>{description(item)}</p>
                      {item.note && <small>{item.note}</small>}
                    </div>
                    <div className="ach-item-meta">
                      {item.done ? <span>{item.date ? `Получено ${fdate(item.date)}` : "Получено"}</span>
                        : item.progress ? <><span className="ach-num">{progressText(item)}</span><div className="ach-mini"><i style={{ width: `${Math.min(100, item.progress[0] / item.progress[1] * 100)}%` }} /></div></>
                          : <span>Ещё не получено</span>}
                      <small>{item.rarity ? `${item.rarity} · ` : ""}{item.src}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {data.revealed && (
              <section>
                <div className="ach-head"><h2>Московское время, города 200k+</h2><p>Цель ветки «Экспансия». Список черновой, численность округлённая.</p></div>
                <div className="ach-msk">{data.msk.map((city) => <span key={city.name} className={city.status}>{city.name}</span>)}</div>
                <div className="ach-legend"><span><i className="done" />есть заказы</span><span><i className="ads" />город запущен</span><span><i className="domain" />куплен домен</span><span><i />свободно</span></div>
              </section>
            )}
            <p className="ach-footnote">Заказы, расчёты и детали берутся из календаря, деньги из {data.moneySource === "таблица" ? "таблицы «Вершина деятельность»" : "сумм в событиях календаря"}. Площадки, команду и абонементы отмечаем вручную.</p>
          </div>
        )}
      </div>
      {celebrate && data && <Celebration data={data} onDone={() => { setCelebrate(false); if (data.revealedBy) writeStore(CELEBRATED_KEY, data.revealedBy.id); }} />}
    </div>
  );
}

const TIER_RANK = { summit: 0, gold: 1, silver: 2, bronze: 3 } as const;

/** Сколько иконок помещается в ряд: следим за шириной контейнера. */
function useRowCapacity() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ capacity: 8, size: 56 });
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const size = width < 420 ? 46 : 56;
      const gap = width < 420 ? 6 : 8;
      setState({ capacity: Math.max(3, Math.floor((width + gap) / (size + gap))), size });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, ...state };
}

function IconRow({ items, total, size, capacity, onOpen }: { items: Achievement[]; total: number; size: number; capacity: number; onOpen: () => void }) {
  const fits = total <= capacity;
  const shown = items.slice(0, fits ? capacity : capacity - 1);
  const rest = total - shown.length;
  return (
    <div className="achb-row">
      {shown.map((item) => {
        const label = item.done ? `${item.name} — ${item.desc}${item.date ? ` · ${fdate(item.date)}` : ""}` : title(item);
        return <button key={item.id} type="button" className="achb-icon" title={label} aria-label={label} onClick={onOpen}><Badge item={item} size={size} /></button>;
      })}
      {rest > 0 && <button type="button" className="achb-more" style={{ width: size, height: size }} onClick={onOpen} aria-label={`Ещё ${rest}`}>+{rest}</button>}
    </div>
  );
}

/** Постоянный блок достижений в калькуляторе, в формате Steam. */
export function AchievementsBlock({ data, error, unseen, onOpen }: { data: AchievementsResult | null; error: string; unseen: number; onOpen: () => void }) {
  const row = useRowCapacity();
  const view = useMemo(() => {
    if (!data) return null;
    const list = data.achievements;
    const done = list.filter((item) => item.done);
    // Недавние: по дате открытия, при равной дате — более редкие выше. Лагеря городов в ряд не берём.
    const recent = done.filter((item) => item.cat !== "Восхождение")
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || TIER_RANK[a.tier] - TIER_RANK[b.tier]);
    const locked = list.filter((item) => !item.done && item.cat !== "Восхождение")
      .sort((a, b) => ((b.progress ? b.progress[0] / b.progress[1] : 0) - (a.progress ? a.progress[0] / a.progress[1] : 0)) || Number(a.hidden) - Number(b.hidden));
    return { list, done, latest: recent[0] || null, recent: recent.slice(1), locked, lockedTotal: list.length - done.length };
  }, [data]);

  return (
    <section className="achb" id="mc-achievements" aria-labelledby="achb-title">
      <h2 id="achb-title" className="achb-label">Достижения</h2>
      <div className="achb-panel">
        {!view && <div className="achb-state">{error ? error : <><LoaderCircle className="spin" size={16} /> Загружаем достижения…</>}</div>}
        {view && data && (
          <>
            <div className="achb-top">
              <div className="achb-got">Вы получили <b>{view.done.length}</b> из <b>{view.list.length}</b> <span>({Math.round(view.done.length / view.list.length * 100)}%)</span></div>
              <div className="achb-bar"><i style={{ width: `${view.done.length / view.list.length * 100}%` }} /></div>
            </div>
            <div className="achb-body" ref={row.ref}>
              {data.revealed && view.latest ? (
                <>
                  <button type="button" className="achb-latest" onClick={onOpen}>
                    <Badge item={view.latest} size={row.size} />
                    <span>
                      <b>{view.latest.name}</b>
                      <small>{view.latest.desc}</small>
                      {view.latest.date && <em>Получено {fdate(view.latest.date)}</em>}
                    </span>
                  </button>
                  {view.recent.length > 0 && <IconRow items={view.recent} total={view.done.length - 1} size={row.size} capacity={row.capacity} onOpen={onOpen} />}
                </>
              ) : (
                <div className="achb-teaser">
                  <Lock size={20} aria-hidden="true" />
                  <span><b>Все достижения пока закрыты</b><small>Первый выполненный заказ откроет разом всё, что «Вершина» уже заработала.</small></span>
                </div>
              )}
            </div>
            <div className="achb-locked">
              <div className="achb-sub">Неполученные достижения</div>
              <IconRow items={view.locked} total={view.lockedTotal} size={row.size} capacity={row.capacity} onOpen={onOpen} />
            </div>
            <div className="achb-foot">
              {unseen > 0 && <span className="achb-new">+{unseen} новых</span>}
              <button type="button" className="achb-link" onClick={onOpen}>Мои достижения</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
