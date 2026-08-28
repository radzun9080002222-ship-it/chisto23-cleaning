import {
  AlertCircle,
  Building2,
  CalendarPlus,
  Check,
  Clipboard,
  Eraser,
  LoaderCircle,
  LockKeyhole,
  Minus,
  Plus,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createCalendarEvent,
  loadPricing,
  type PricingConfig,
} from "./managerApi";

type CleaningType = "wet" | "general" | "repair" | "allInclusive";
type CounterState = Record<string, number>;

const ACCESS_KEY = "chisto23_calc_pin";
const CALC_PIN = import.meta.env.VITE_CALC_PIN || "3715";

const CITIES = [
  { id: "sochi", label: "Сочи", timeZone: "Europe/Moscow" },
  { id: "lipetsk", label: "Липецк", timeZone: "Europe/Moscow" },
  { id: "novy-urengoy", label: "Новый Уренгой", timeZone: "Asia/Yekaterinburg" },
  { id: "moscow", label: "Москва", timeZone: "Europe/Moscow" },
  { id: "abkhazia", label: "Абхазия", timeZone: "Europe/Moscow" },
] as const;

const CLEANING_LABELS: Record<CleaningType, string> = {
  wet: "Влажная уборка",
  general: "Генеральная уборка",
  repair: "После ремонта",
  allInclusive: "Всё включено",
};

const CLEANING_DURATION: Record<CleaningType, { label: string; calendarHours: number }> = {
  wet: { label: "2–4 часа", calendarHours: 4 },
  general: { label: "4–6 часов", calendarHours: 6 },
  repair: { label: "6–8 часов", calendarHours: 8 },
  allInclusive: { label: "6–8 часов", calendarHours: 8 },
};

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = ["00", "10", "20", "30", "40", "50"];

const DEFAULT_PRICING: PricingConfig = {
  cleaning: {
    wet: { rate: 160, minimum: 6000 },
    general: { rate: 250, minimum: 9000 },
    repair: { rate: 300, minimum: 12000 },
    allInclusive: { standardRate: 450, panoramicRate: 550, minimum: 12000 },
  },
  windows: {
    panoramic: { usual: 1000, repair: 1000 },
    standard: { usual: 500, repair: 750 },
    mini: { usual: 400, repair: 500 },
    balconyDoor: { usual: 1200, repair: 1500 },
  },
  extras: {
    fridge: 900,
    fridge2: 1800,
    oven: 900,
    microwave: 500,
    hood: 700,
    kitchenCabinet: 250,
    curtainsWash: 1500,
    curtainsIron: 1000,
    ironing: 800,
    linen: 500,
    chandelier: 500,
    chandelierBig: 1500,
    airConditioner: 500,
    seams: 3000,
  },
  dry: {
    sofa: 3500,
    corner: 4900,
    sofa3: 6500,
    mattress1: 1500,
    mattress2: 2600,
    headboard: 1500,
    bedside: 1500,
    pillow: 500,
    armchair: 1500,
    bench: 1200,
    pouf: 550,
    chair: 500,
    rug: 600,
    carpet: 550,
  },
  special: { bathroom: 6000, mold: 1500, remoteTrip: 2000, kitchen: 7000 },
};

const WINDOWS = [
  { id: "panoramic", label: "Панорамная створка", unit: "шт." },
  { id: "standard", label: "Стандартная створка", unit: "шт." },
  { id: "mini", label: "Мини-окно", unit: "шт." },
  { id: "balconyDoor", label: "Балконная дверь", unit: "шт." },
] as const;

const EXTRAS = [
  { id: "fridge", label: "Холодильник стандарт", unit: "шт." },
  { id: "fridge2", label: "Холодильник Двухдверный", unit: "шт." },
  { id: "oven", label: "Духовой шкаф внутри", unit: "шт." },
  { id: "microwave", label: "Микроволновка", unit: "шт." },
  { id: "hood", label: "Вытяжка", unit: "шт." },
  { id: "kitchenCabinet", label: "Кухонный шкаф внутри", unit: "шт." },
  { id: "curtainsWash", label: "Шторы: постирать и повесить", unit: "окно" },
  { id: "curtainsIron", label: "Шторы: погладить", unit: "окно" },
  { id: "ironing", label: "Глажка белья", unit: "час" },
  { id: "linen", label: "Смена белья", unit: "раз" },
  { id: "chandelier", label: "Люстра обычная", unit: "шт." },
  { id: "chandelierBig", label: "Люстра большая", unit: "шт." },
  { id: "airConditioner", label: "Кондиционер (сетка)", unit: "шт." },
  { id: "seams", label: "Швы отпаривателем", unit: "комната" },
] as const;

const DRY_CLEANING = [
  { id: "sofa", label: "Диван стандарт", unit: "шт." },
  { id: "corner", label: "Диван угловой", unit: "шт." },
  { id: "sofa3", label: "Диван трёхместный", unit: "шт." },
  { id: "mattress1", label: "Матрас односпальный, 1 сторона", unit: "шт." },
  { id: "mattress2", label: "Матрас двухспальный, 1 сторона", unit: "шт." },
  { id: "headboard", label: "Кровать — изголовье", unit: "шт." },
  { id: "bedside", label: "Кровать — тканевый борт", unit: "шт." },
  { id: "pillow", label: "Подушка", unit: "шт." },
  { id: "armchair", label: "Кресло", unit: "шт." },
  { id: "bench", label: "Банкетка", unit: "шт." },
  { id: "pouf", label: "Пуфик", unit: "шт." },
  { id: "chair", label: "Стул", unit: "шт." },
  { id: "rug", label: "Ковёр", unit: "м²" },
  { id: "carpet", label: "Ковролин", unit: "м²" },
] as const;

const fmt = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;

const formatDateTime = (date: string, time: string) => {
  const timeText = time
    ? `${Number(time.split(":")[0])}:${time.split(":")[1]}`
    : "";
  if (!date) return timeText;
  const [year, month, day] = date.split("-").map(Number);
  const dateText = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day))).replace(/\s*г\.$/, "");
  return [dateText, timeText].filter(Boolean).join(", ");
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const areaElement = document.createElement("textarea");
    areaElement.value = text;
    document.body.appendChild(areaElement);
    areaElement.select();
    document.execCommand("copy");
    areaElement.remove();
  }
};

const addHours = (date: string, time: string, duration: number) => {
  const value = new Date(`${date}T${time}:00`);
  value.setHours(value.getHours() + duration);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="manager-section">
    <h2>{title}</h2>
    {children}
  </section>
);

const Counter = ({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) => (
  <div className="manager-counter">
    <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} aria-label={`Уменьшить: ${label}`}>
      <Minus size={15} />
    </button>
    <span>{value}</span>
    <button type="button" onClick={() => onChange(value + 1)} aria-label={`Увеличить: ${label}`}>
      <Plus size={15} />
    </button>
  </div>
);

function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pin !== CALC_PIN) {
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
        <h1>Калькулятор менеджера</h1>
        <p>Введите четырёхзначный PIN-код</p>
        <label htmlFor="manager-pin">PIN-код</label>
        <input
          id="manager-pin"
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(false);
          }}
          aria-invalid={error}
        />
        {error && <div className="manager-form-error">Неверный PIN-код</div>}
        <button className="manager-primary" type="submit" disabled={pin.length !== 4}>Открыть калькулятор</button>
      </form>
    </main>
  );
}

function ManagerCalculator({ pin }: { pin: string }) {
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [pricingSource, setPricingSource] = useState<"loading" | "supabase" | "fallback">("loading");
  const [cityId, setCityId] = useState<(typeof CITIES)[number]["id"]>("sochi");
  const [type, setType] = useState<CleaningType>("general");
  const [area, setArea] = useState(0);
  const [dirt, setDirt] = useState(1);
  const [glassType, setGlassType] = useState<"standard" | "panoramic">("standard");
  const [windows, setWindows] = useState<CounterState>({});
  const [panoramicPrice, setPanoramicPrice] = useState(1000);
  const [windowFilm, setWindowFilm] = useState(false);
  const [extras, setExtras] = useState<CounterState>({});
  const [dry, setDry] = useState<CounterState>({});
  const [bathrooms, setBathrooms] = useState(0);
  const [mold, setMold] = useState(false);
  const [remoteTrip, setRemoteTrip] = useState(false);
  const [kitchenOnly, setKitchenOnly] = useState(false);
  const [manualPrice, setManualPrice] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<number | null>(null);
  const [cleanerPayment, setCleanerPayment] = useState<number | null>(null);
  const [brigadierPayment, setBrigadierPayment] = useState(0);
  const [leadCost, setLeadCost] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [showMarginSettings, setShowMarginSettings] = useState(false);
  const [client, setClient] = useState({
    date: "",
    time: "",
    name: "",
    phone: "",
    address: "",
    floor: "",
    apartment: "",
    entrance: "",
    intercom: "",
    note: "",
  });
  const [copied, setCopied] = useState(false);
  const [brigadierCopied, setBrigadierCopied] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [calendarMessage, setCalendarMessage] = useState("");

  useEffect(() => {
    document.title = "Калькулятор менеджера — Вершина";
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow, noarchive";

    let cancelled = false;
    loadPricing(pin)
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setPricing(saved);
          setPricingSource("supabase");
        } else {
          setPricingSource("fallback");
        }
      })
      .catch(() => {
        if (!cancelled) setPricingSource("fallback");
      });
    return () => { cancelled = true; };
  }, [pin]);

  const city = CITIES.find((item) => item.id === cityId)!;
  const setClientValue = (key: keyof typeof client, value: string) => setClient((current) => ({ ...current, [key]: value }));
  const updateCounter = (setter: React.Dispatch<React.SetStateAction<CounterState>>, id: string, value: number) => {
    setter((current) => ({ ...current, [id]: Math.max(0, value) }));
  };

  const calculation = useMemo(() => {
    const lines: { label: string; brigadierLabel: string; sum: number; group: "cleaning" | "dry" | "other" }[] = [];
    let rate = 0;
    let minimum = 0;
    if (type === "allInclusive") {
      rate = glassType === "panoramic"
        ? pricing.cleaning.allInclusive.panoramicRate
        : pricing.cleaning.allInclusive.standardRate;
      minimum = pricing.cleaning.allInclusive.minimum;
    } else {
      rate = pricing.cleaning[type].rate;
      minimum = pricing.cleaning[type].minimum;
    }
    if (area > 0) {
      const raw = Math.round(area * rate * dirt);
      const sum = Math.max(raw, minimum);
      lines.push({
        label: `${CLEANING_LABELS[type]}, ${area} м² × ${rate} ₽${dirt > 1 ? ` × ${dirt.toFixed(1)}` : ""}${sum > raw ? " (минимальный заказ)" : ""}`,
        brigadierLabel: `${CLEANING_LABELS[type]}, ${area} м²${dirt > 1 ? `, загрязнённость ×${dirt.toFixed(1)}` : ""}`,
        sum,
        group: "cleaning",
      });
    }

    WINDOWS.forEach((item) => {
      const count = windows[item.id] || 0;
      if (!count) return;
      const base = item.id === "panoramic"
        ? panoramicPrice
        : pricing.windows[item.id][type === "repair" ? "repair" : "usual"];
      const sum = count * base * (type === "repair" && windowFilm ? 2 : 1);
      const label = `${item.label} × ${count}${type === "repair" && windowFilm ? " (плёнка ×2)" : ""}`;
      lines.push({ label, brigadierLabel: label, sum, group: "other" });
    });

    EXTRAS.forEach((item) => {
      const count = extras[item.id] || 0;
      if (count) {
        const label = `${item.label} × ${count} ${item.unit}`;
        lines.push({ label, brigadierLabel: label, sum: count * pricing.extras[item.id], group: "other" });
      }
    });
    DRY_CLEANING.forEach((item) => {
      const count = dry[item.id] || 0;
      if (count) {
        const label = `Химчистка: ${item.label} × ${count} ${item.unit}`;
        lines.push({ label, brigadierLabel: label, sum: count * pricing.dry[item.id], group: "dry" });
      }
    });
    if (bathrooms) {
      const label = `Отдельный санузел/ванная × ${bathrooms}`;
      lines.push({ label, brigadierLabel: label, sum: bathrooms * pricing.special.bathroom, group: "other" });
    }
    if (mold) lines.push({ label: "Обработка плесени", brigadierLabel: "Обработка плесени", sum: pricing.special.mold, group: "other" });
    if (remoteTrip) lines.push({ label: "Удалённый выезд", brigadierLabel: "Удалённый выезд", sum: pricing.special.remoteTrip, group: "other" });
    if (kitchenOnly) lines.push({ label: "Выезд только на кухню", brigadierLabel: "Выезд только на кухню", sum: pricing.special.kitchen ?? 7000, group: "other" });

    const total = lines.reduce((sum, line) => sum + line.sum, 0);
    const dryTotal = lines.filter((line) => line.group === "dry").reduce((sum, line) => sum + line.sum, 0);
    return { lines, total, dryTotal, rate, minimum };
  }, [area, bathrooms, dirt, dry, extras, glassType, kitchenOnly, mold, panoramicPrice, pricing, remoteTrip, type, windowFilm, windows]);

  const finalTotal = manualPrice ?? calculation.total;
  const hasManualPrice = manualPrice !== null && manualPrice !== calculation.total;
  const discountPercent = hasManualPrice && finalTotal < calculation.total && calculation.total > 0
    ? Math.round((1 - finalTotal / calculation.total) * 100)
    : 0;
  const markupPercent = hasManualPrice && finalTotal > calculation.total && calculation.total > 0
    ? Math.round((finalTotal / calculation.total - 1) * 100)
    : 0;
  const cleanerCost = cleanerPayment ?? 0;
  const otherExpenses = expenses ?? 0;
  const taxCost = finalTotal * taxPercent / 100;
  const dealCosts = otherExpenses + cleanerCost + brigadierPayment + leadCost + taxCost;
  const margin = finalTotal - dealCosts;
  const marginPercent = finalTotal > 0 ? (margin / finalTotal) * 100 : 0;
  const duration = CLEANING_DURATION[type];

  const addressDetails = [
    client.address,
    client.floor && `этаж ${client.floor}`,
    client.apartment && `кв. ${client.apartment}`,
  ].filter(Boolean).join(", ");
  const formattedDateTime = formatDateTime(client.date, client.time);

  const estimateRows = calculation.lines.map((line) => `• ${line.label} — ${fmt(line.sum)}`).join("\n");
  const clientRows = [
    `Город: ${city.label}`,
    client.name && `Имя: ${client.name}`,
    client.phone && `Телефон: ${client.phone}`,
    formattedDateTime && `Дата и время: ${formattedDateTime}`,
    `Ориентировочная длительность: ${duration.label}`,
    addressDetails && `Адрес: ${addressDetails}`,
    client.entrance && `Подъезд: ${client.entrance}`,
    client.intercom && `Код домофона: ${client.intercom}`,
    client.note && `Дополнительно: ${client.note}`,
  ].filter(Boolean).join("\n");
  const totalRows = hasManualPrice
    ? `ИТОГО ПО ПРАЙСУ: ${fmt(calculation.total)}\nЦЕНА ДЛЯ КЛИЕНТА: ${fmt(finalTotal)}${discountPercent > 0 ? ` (скидка ${discountPercent}%)` : ""}`
    : `ИТОГО: ${fmt(finalTotal)}`;
  const estimateText = `Расчёт стоимости уборки «Вершина»\n\n${estimateRows || "Позиции не выбраны"}\n\n${totalRows}\n\nДанные клиента:\n${clientRows}\n\nЦену фиксируем до начала работ. Оплата после приёмки по чек-листу.`;
  const calendarDescription = `Расчёт стоимости уборки «Вершина»\n\n${estimateRows || "Позиции не выбраны"}\n\n${totalRows}\nРасходы: ${fmt(dealCosts)}\nЧистая прибыль: ${fmt(margin)}\n\nДанные клиента:\n${clientRows}\n\nЦену фиксируем до начала работ. Оплата после приёмки по чек-листу.`;
  const brigadierRows = calculation.lines.map((line) => `• ${line.brigadierLabel}`).join("\n");
  const brigadierText = `${brigadierRows || "Позиции не выбраны"}\n\nДанные клиента:\n${clientRows}`;

  const copyEstimate = async () => {
    await copyText(estimateText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const copyForBrigadier = async () => {
    await copyText(brigadierText);
    setBrigadierCopied(true);
    window.setTimeout(() => setBrigadierCopied(false), 2200);
  };

  const calendarReady = calculation.lines.length > 0 && Boolean(client.date && client.time && client.name && client.phone && client.address);
  const sendToCalendar = async () => {
    if (!calendarReady || calendarStatus === "sending") return;
    setCalendarStatus("sending");
    setCalendarMessage("");
    const hasDry = calculation.dryTotal > 0;
    const baseTitle = area > 0 ? `${CLEANING_LABELS[type]}, ${area} м²` : "Химчистка мебели";
    try {
      await createCalendarEvent(pin, {
        summary: `${baseTitle}${hasDry && area > 0 ? " + Химчистка" : ""}`,
        description: calendarDescription,
        location: `${city.label}, ${addressDetails}`,
        startDateTime: `${client.date}T${client.time}:00`,
        endDateTime: addHours(client.date, client.time, duration.calendarHours),
        timeZone: city.timeZone,
      });
      setCalendarStatus("ok");
      setCalendarMessage("Событие добавлено в Google Calendar");
    } catch (error) {
      setCalendarStatus("error");
      setCalendarMessage(error instanceof Error ? error.message : "Не удалось добавить событие");
    }
  };

  const reset = () => {
    setCityId("sochi");
    setType("general");
    setArea(0);
    setDirt(1);
    setGlassType("standard");
    setWindows({});
    setPanoramicPrice(1000);
    setWindowFilm(false);
    setExtras({});
    setDry({});
    setBathrooms(0);
    setMold(false);
    setRemoteTrip(false);
    setKitchenOnly(false);
    setManualPrice(null);
    setExpenses(null);
    setCleanerPayment(null);
    setBrigadierPayment(0);
    setLeadCost(0);
    setTaxPercent(0);
    setShowMarginSettings(false);
    setClient({ date: "", time: "", name: "", phone: "", address: "", floor: "", apartment: "", entrance: "", intercom: "", note: "" });
    setCopied(false);
    setBrigadierCopied(false);
    setCalendarStatus("idle");
    setCalendarMessage("");
  };

  return (
    <div className="manager-calc">
      <header className="manager-header">
        <div className="manager-container manager-header-inner">
          <div className="manager-brand"><Sparkles size={21} /><span>Вершина</span><small>калькулятор менеджера</small></div>
          <label className="manager-city">
            <Building2 size={17} />
            <span>Город</span>
            <select value={cityId} onChange={(event) => setCityId(event.target.value as typeof cityId)}>
              {CITIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </header>

      <main className="manager-container manager-layout">
        <div className="manager-main-column">
          <Section title="Уборка">
            <div className="manager-tabs">
              {(Object.keys(CLEANING_LABELS) as CleaningType[]).map((item) => (
                <button key={item} type="button" className={type === item ? "active" : ""} onClick={() => setType(item)}>{CLEANING_LABELS[item]}</button>
              ))}
            </div>
            {type === "allInclusive" && (
              <div className="manager-inline-options">
                <span>Тип остекления</span>
                <button type="button" className={glassType === "standard" ? "active" : ""} onClick={() => setGlassType("standard")}>Стандартные окна · {pricing.cleaning.allInclusive.standardRate} ₽/м²</button>
                <button type="button" className={glassType === "panoramic" ? "active" : ""} onClick={() => setGlassType("panoramic")}>Панорамные окна · {pricing.cleaning.allInclusive.panoramicRate} ₽/м²</button>
              </div>
            )}
            <div className="manager-field-row">
              <label><span>Площадь, м²</span><input type="number" min={0} max={1000} value={area || ""} onChange={(event) => setArea(Math.max(0, Number(event.target.value) || 0))} /></label>
              <div className="manager-rate"><span>Ставка</span><strong>{calculation.rate} ₽/м²</strong><small>минимум {fmt(calculation.minimum)}</small></div>
            </div>
            <div className="manager-range">
              <div><span>Коэффициент загрязнённости</span><strong>×{dirt.toFixed(1)}</strong></div>
              <input type="range" min={1} max={3} step={0.1} value={dirt} onChange={(event) => setDirt(Number(event.target.value))} />
              <small>Применяется только к стоимости уборки по площади</small>
            </div>
          </Section>

          <Section title="Окна">
            <div className="manager-price-list">
              {WINDOWS.map((item) => {
                const price = item.id === "panoramic" ? panoramicPrice : pricing.windows[item.id][type === "repair" ? "repair" : "usual"];
                return <div className="manager-price-row" key={item.id}><div><strong>{item.label}</strong>{item.id === "panoramic" ? <label className="manager-unit-price"><input aria-label="Цена панорамной створки" type="number" min={0} step={100} value={panoramicPrice || ""} onChange={(event) => setPanoramicPrice(Math.max(0, Number(event.target.value) || 0))} /><span>₽ / {item.unit}</span></label> : <small>{fmt(price)} / {item.unit}</small>}</div><Counter label={item.label} value={windows[item.id] || 0} onChange={(value) => updateCounter(setWindows, item.id, value)} /></div>;
              })}
            </div>
            {type === "repair" && <label className="manager-check"><input type="checkbox" checked={windowFilm} onChange={(event) => setWindowFilm(event.target.checked)} /><span><strong>Защитная плёнка на окнах</strong><small>Стоимость мойки окон ×2</small></span></label>}
          </Section>

          <Section title="Дополнительные услуги">
            <div className="manager-price-list">
              {EXTRAS.map((item) => <div className="manager-price-row" key={item.id}><div><strong>{item.label}</strong><small>{fmt(pricing.extras[item.id])} / {item.unit}</small></div><Counter label={item.label} value={extras[item.id] || 0} onChange={(value) => updateCounter(setExtras, item.id, value)} /></div>)}
            </div>
          </Section>

          <Section title="Химчистка">
            <p className="manager-section-note">Цены синхронизированы с действующим прайсом chisto23.ru.</p>
            <div className="manager-price-list manager-price-grid">
              {DRY_CLEANING.map((item) => <div className="manager-price-row" key={item.id}><div><strong>{item.label}</strong><small>{fmt(pricing.dry[item.id])} / {item.unit}</small></div><Counter label={item.label} value={dry[item.id] || 0} onChange={(value) => updateCounter(setDry, item.id, value)} /></div>)}
            </div>
          </Section>

          <Section title="Особые условия">
            <div className="manager-specials">
              <label><span>Дополнительный санузел · {fmt(pricing.special.bathroom)}</span><Counter label="Дополнительный санузел" value={bathrooms} onChange={setBathrooms} /></label>
              <label className="manager-check"><input type="checkbox" checked={mold} onChange={(event) => setMold(event.target.checked)} /><span><strong>Обработка плесени</strong><small>{fmt(pricing.special.mold)}</small></span></label>
              <label className="manager-check"><input type="checkbox" checked={remoteTrip} onChange={(event) => setRemoteTrip(event.target.checked)} /><span><strong>Удалённый выезд</strong><small>{fmt(pricing.special.remoteTrip)}</small></span></label>
              <label className="manager-check"><input type="checkbox" checked={kitchenOnly} onChange={(event) => setKitchenOnly(event.target.checked)} /><span><strong>Выезд только на кухню</strong><small>{fmt(pricing.special.kitchen ?? 7000)}</small></span></label>
            </div>
          </Section>
        </div>

        <aside className="manager-sidebar">
          <div className="manager-summary">
            <div className="manager-summary-head"><span>Расчёт</span><small className={`source-${pricingSource}`}>{pricingSource === "supabase" ? "цены из Supabase" : pricingSource === "loading" ? "загрузка цен…" : "резервный прайс"}</small></div>
            {calculation.lines.length ? <div className="manager-lines">{calculation.lines.map((line, index) => <div key={`${line.label}-${index}`}><span>{line.label}</span><strong>{fmt(line.sum)}</strong></div>)}</div> : <div className="manager-empty">Добавьте площадь, услугу или химчистку</div>}
            <div className="manager-total"><span>Итого по прайсу</span><strong>{fmt(calculation.total)}</strong></div>
            <label className="manager-manual manager-manual-with-note"><span>Цена для клиента{discountPercent > 0 && <small>Скидка {discountPercent}% · −{fmt(calculation.total - finalTotal)}</small>}{markupPercent > 0 && <small className="markup">Наценка {markupPercent}% · +{fmt(finalTotal - calculation.total)}</small>}</span><input type="number" min={0} value={(manualPrice ?? calculation.total) || ""} onChange={(event) => { const value = Number(event.target.value); setManualPrice(value === calculation.total ? null : Math.max(0, value || 0)); }} /></label>
            <label className="manager-manual manager-expenses"><span>Расходы<small>Другие фактические расходы, необязательно</small></span><input type="number" min={0} step={100} placeholder="0" value={expenses ?? ""} onChange={(event) => setExpenses(event.target.value === "" ? null : Math.max(0, Number(event.target.value) || 0))} /></label>
            {calculation.total > 0 && <>
              <div className={`manager-margin ${marginPercent >= 30 ? "good" : marginPercent >= 20 ? "warn" : "bad"}`}><div><span>Маржа сделки</span><strong>{fmt(margin)}</strong></div><b>{marginPercent.toFixed(0)}%</b><small>Расходы: {fmt(dealCosts)} · чистая прибыль после указанных затрат</small></div>
              <button type="button" className="manager-margin-toggle" onClick={() => setShowMarginSettings((value) => !value)}><Settings2 size={15} />{showMarginSettings ? "Скрыть параметры маржи" : "Параметры маржи"}</button>
              {showMarginSettings && <div className="manager-margin-settings">
                <label><span>Оплата клинеру</span><div><input aria-label="Оплата клинеру" type="number" min={0} step={100} value={cleanerPayment ?? ""} placeholder="0" onChange={(event) => setCleanerPayment(event.target.value === "" ? null : Math.max(0, Number(event.target.value) || 0))} /><small>₽</small></div></label>
                <label><span>Оплата Бригадиру</span><div><input aria-label="Оплата Бригадиру" type="number" min={0} step={100} value={brigadierPayment || ""} placeholder="0" onChange={(event) => setBrigadierPayment(Math.max(0, Number(event.target.value) || 0))} /><small>₽</small></div></label>
                <label><span>Стоимость рекламного лида</span><div><input aria-label="Стоимость рекламного лида" type="number" min={0} step={100} value={leadCost || ""} placeholder="0" onChange={(event) => setLeadCost(Math.max(0, Number(event.target.value) || 0))} /><small>₽</small></div></label>
                <label><span>Налог от выручки</span><div><input aria-label="Налог от выручки" type="number" min={0} max={100} step={0.1} value={taxPercent || ""} placeholder="0" onChange={(event) => setTaxPercent(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /><small>%</small></div></label>
                <div><span>Налог в рублях</span><strong>{fmt(taxCost)}</strong></div>
              </div>}
            </>}
          </div>

          <div className="manager-client">
            <h2>Данные клиента</h2>
            <div className="manager-form-grid">
              <label><span>День уборки *</span><input type="date" value={client.date} onChange={(event) => setClientValue("date", event.target.value)} /></label>
              <label><span>Время *</span><span className="manager-time-selects"><select aria-label="Часы" value={client.time.split(":")[0] || ""} onChange={(event) => setClientValue("time", event.target.value ? `${event.target.value}:${client.time.split(":")[1] || "00"}` : "")}><option value="">Часы</option>{HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select><select aria-label="Минуты" disabled={!client.time} value={client.time.split(":")[1] || "00"} onChange={(event) => setClientValue("time", `${client.time.split(":")[0]}:${event.target.value}`)}>{MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}</select></span></label>
              <label><span>Длительность</span><input className="manager-readonly" readOnly value={duration.label} /></label>
              <label><span>Имя *</span><input value={client.name} onChange={(event) => setClientValue("name", event.target.value)} /></label>
              <label className="wide"><span>Телефон *</span><input type="text" placeholder="+7" value={client.phone} onChange={(event) => setClientValue("phone", event.target.value)} /></label>
              <label className="wide"><span>Адрес *</span><input placeholder="Улица, дом" value={client.address} onChange={(event) => setClientValue("address", event.target.value)} /></label>
              <label><span>Этаж</span><input value={client.floor} onChange={(event) => setClientValue("floor", event.target.value)} /></label>
              <label><span>Квартира</span><input value={client.apartment} onChange={(event) => setClientValue("apartment", event.target.value)} /></label>
              <label><span>Код домофона</span><input value={client.intercom} onChange={(event) => setClientValue("intercom", event.target.value)} /></label>
              <label><span>Подъезд</span><input value={client.entrance} onChange={(event) => setClientValue("entrance", event.target.value)} /></label>
              <label className="wide"><span>Дополнительно</span><textarea rows={3} placeholder="Парковка, питомцы, пожелания…" value={client.note} onChange={(event) => setClientValue("note", event.target.value)} /></label>
            </div>
            <div className="manager-actions">
              <button type="button" className="manager-calendar" disabled={!calendarReady || calendarStatus === "sending"} onClick={sendToCalendar}>
                {calendarStatus === "sending" ? <LoaderCircle className="spin" size={18} /> : calendarStatus === "ok" ? <Check size={18} /> : <CalendarPlus size={18} />}
                {calendarStatus === "sending" ? "Добавляем…" : calendarStatus === "ok" ? "Добавлено в календарь" : "Отправить в Google Calendar"}
              </button>
              {!calendarReady && calculation.lines.length > 0 && <p className="manager-hint">Для календаря заполните дату, время, имя, телефон и адрес.</p>}
              {calendarMessage && <p className={`manager-status ${calendarStatus}`}><AlertCircle size={14} />{calendarMessage}</p>}
              <button type="button" className="manager-secondary" disabled={!calculation.lines.length} onClick={copyEstimate}>{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? "Скопировано" : "Скопировать смету + данные"}</button>
              <button type="button" className="manager-secondary manager-brigadier" disabled={!calculation.lines.length} onClick={copyForBrigadier}>{brigadierCopied ? <Check size={17} /> : <Clipboard size={17} />}{brigadierCopied ? "Скопировано для бригадира" : "Скопировать для бригадира"}</button>
              <button type="button" className="manager-secondary" onClick={reset}><Eraser size={17} />Сбросить всё</button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function InternalCalc() {
  const [pin, setPin] = useState(() => typeof window === "undefined" ? "" : sessionStorage.getItem(ACCESS_KEY) || "");
  return pin === CALC_PIN ? <ManagerCalculator pin={pin} /> : <PinGate onUnlock={setPin} />;
}
