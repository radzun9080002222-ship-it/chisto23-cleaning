export type PricingConfig = {
  cleaning: {
    wet: { rate: number; minimum: number };
    general: { rate: number; minimum: number };
    repair: { rate: number; minimum: number };
    facadeGeneral: { standardRate: number; panoramicRate: number; minimum: number };
    allInclusive: { standardRate: number; panoramicRate: number; minimum: number };
  };
  windows: Record<string, { usual: number; repair: number }>;
  extras: Record<string, number>;
  dry: Record<string, number>;
  special: { bathroom: number; mold: number; remoteTrip: number; kitchen: number; cabinet: number };
};

export const CITIES = [
  { id: "unknown", label: "Не определен", timeZone: "Europe/Moscow" },
  { id: "abkhazia", label: "Абхазия", timeZone: "Europe/Moscow" },
  { id: "balashikha", label: "Балашиха", timeZone: "Europe/Moscow" },
  { id: "volgograd", label: "Волгоград", timeZone: "Europe/Moscow" },
  { id: "voronezh", label: "Воронеж", timeZone: "Europe/Moscow" },
  { id: "yoshkar-ola", label: "Йошкар-Ола", timeZone: "Europe/Moscow" },
  { id: "kazan", label: "Казань", timeZone: "Europe/Moscow" },
  { id: "kaluga", label: "Калуга", timeZone: "Europe/Moscow" },
  { id: "kirov", label: "Киров", timeZone: "Europe/Moscow" },
  { id: "kursk", label: "Курск", timeZone: "Europe/Moscow" },
  { id: "lipetsk", label: "Липецк", timeZone: "Europe/Moscow" },
  { id: "naberezhnye-chelny", label: "Набережные Челны", timeZone: "Europe/Moscow" },
  { id: "novy-urengoy", label: "Новый Уренгой", timeZone: "Asia/Yekaterinburg" },
  { id: "penza", label: "Пенза", timeZone: "Europe/Moscow" },
  { id: "ryazan", label: "Рязань", timeZone: "Europe/Moscow" },
  { id: "salekhard", label: "Салехард", timeZone: "Asia/Yekaterinburg" },
  { id: "sochi", label: "Сочи", timeZone: "Europe/Moscow" },
  { id: "stavropol", label: "Ставрополь", timeZone: "Europe/Moscow" },
  { id: "tver", label: "Тверь", timeZone: "Europe/Moscow" },
  { id: "tula", label: "Тула", timeZone: "Europe/Moscow" },
  { id: "cheboksary", label: "Чебоксары", timeZone: "Europe/Moscow" },
] as const;

export type CityId = (typeof CITIES)[number]["id"];
export type CityCoefficients = Partial<Record<CityId, number>>;
export const MINIMUM_VISIT_PRICE = 6000;
export const BASE_GENERAL_RATE = 230;

export function cityPriceLabel(city: (typeof CITIES)[number], coefficients: CityCoefficients): string {
  const coefficient = coefficients[city.id];
  if (city.id === "unknown" || coefficient === undefined) return city.label;
  const rounded = Math.round(coefficient * 100) / 100;
  const approximate = Math.abs(rounded - coefficient) > 0.000001 ? "≈" : "";
  return `${city.label} ${approximate}×${rounded.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}`;
}

export function cityPriceCoefficients(rows: ReadonlyArray<{ id: string; data: unknown }>): CityCoefficients {
  const base = readPrice(rows.find((row) => row.id === "default")?.data, ["cleaning", "general", "rate"]);
  if (!base || !Number.isFinite(base)) throw new Error("Общий тариф генеральной уборки должен быть положительным");
  return Object.fromEntries(CITIES.map((city) => {
    const rate = readPrice(rows.find((row) => row.id === city.id)?.data, ["cleaning", "general", "rate"]) ?? base;
    if (!Number.isFinite(rate) || rate < 0) throw new Error("Некорректный городской тариф генеральной уборки");
    return [city.id, rate / base];
  }));
}
export type PricingCityId = Exclude<CityId, "unknown">;
export type PricingSnapshot = { pricing: PricingConfig; updatedAt: string | null; inherited: boolean };
export type PricingField = { path: string[]; label: string };
export type PricingGroup = { title: string; fields: PricingField[] };

const unitFields = (group: string, items: [string, string][]): PricingField[] =>
  items.map(([id, label]) => ({ path: [group, id], label }));

export const PRICING_GROUPS: PricingGroup[] = [
  { title: "Уборка", fields: [
    { path: ["cleaning", "wet", "rate"], label: "Влажная · ₽/м²" },
    { path: ["cleaning", "wet", "minimum"], label: "Влажная · минимальный заказ" },
    { path: ["cleaning", "general", "rate"], label: "Генеральная · ₽/м²" },
    { path: ["cleaning", "general", "minimum"], label: "Генеральная · минимальный заказ" },
    { path: ["cleaning", "repair", "rate"], label: "После ремонта · ₽/м²" },
    { path: ["cleaning", "repair", "minimum"], label: "После ремонта · минимальный заказ" },
    { path: ["cleaning", "facadeGeneral", "standardRate"], label: "Фасадная генеральная с окнами · стандартные окна · ₽/м²" },
    { path: ["cleaning", "facadeGeneral", "panoramicRate"], label: "Фасадная генеральная с окнами · панорамные окна · ₽/м²" },
    { path: ["cleaning", "facadeGeneral", "minimum"], label: "Фасадная генеральная с окнами · минимальный заказ" },
    { path: ["cleaning", "allInclusive", "standardRate"], label: "Всё включено · стандартные окна · ₽/м²" },
    { path: ["cleaning", "allInclusive", "panoramicRate"], label: "Всё включено · панорамные окна · ₽/м²" },
    { path: ["cleaning", "allInclusive", "minimum"], label: "Всё включено · минимальный заказ" },
  ] },
  { title: "Окна", fields: [
    ["panoramic", "Панорамная створка"], ["standard", "Стандартная створка"],
    ["mini", "Мини-окно"], ["balconyDoor", "Балконная дверь"],
  ].flatMap(([id, label]) => [
    { path: ["windows", id, "usual"], label: `${label} · обычная мойка` },
    { path: ["windows", id, "repair"], label: `${label} · после ремонта` },
  ]) },
  { title: "Дополнительные услуги", fields: unitFields("extras", [
    ["fridge", "Холодильник стандарт"], ["fridge2", "Холодильник двухдверный"],
    ["oven", "Духовой шкаф внутри"], ["microwave", "Микроволновка"], ["hood", "Вытяжка"],
    ["kitchenCabinet", "Кухонный шкаф внутри"], ["curtainsWash", "Шторы: постирать и повесить"],
    ["curtainsIron", "Шторы: погладить"], ["ironing", "Глажка белья · ₽/час"],
    ["linen", "Смена белья"], ["chandelier", "Люстра обычная"], ["chandelierBig", "Люстра большая"],
    ["airConditioner", "Кондиционер (сетка)"], ["seams", "Швы отпаривателем · ₽/комната"],
  ]) },
  { title: "Химчистка", fields: unitFields("dry", [
    ["sofa", "Диван стандарт"], ["corner", "Диван угловой"], ["sofa3", "Диван буквой П"],
    ["mattress1", "Матрас односпальный · 1 сторона"], ["mattress2", "Матрас двухспальный · 1 сторона"],
    ["headboard", "Кровать · изголовье"], ["bedside", "Кровать · тканевый борт"], ["pillow", "Подушка"],
    ["armchair", "Кресло"], ["bench", "Банкетка"], ["pouf", "Пуфик"], ["chair", "Стул"],
    ["rug", "Ковёр · ₽/м²"], ["carpet", "Ковролин · ₽/м²"],
  ]) },
  { title: "Особые условия", fields: unitFields("special", [
    ["bathroom", "Дополнительный санузел"], ["mold", "Обработка плесени"],
    ["remoteTrip", "Удалённый выезд"], ["kitchen", "Выезд только на кухню"],
    ["cabinet", "Шкафы внутри"],
  ]) },
];

export function validateCityId(value: unknown): CityId {
  if (typeof value !== "string" || !CITIES.some((city) => city.id === value)) {
    throw new Error("Выберите город из списка");
  }
  return value as CityId;
}

export function validatePricingCityId(value: unknown): PricingCityId {
  const cityId = validateCityId(value);
  if (cityId === "unknown") throw new Error("Для города «Не определен» отдельный прайс не настраивается");
  return cityId;
}

export function readPrice(value: unknown, path: string[]): number | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  if (current === undefined && path.join(".") === "special.kitchen") return 6000;
  if (current === undefined && path.join(".") === "special.cabinet") return 1000;
  return typeof current === "number" ? current : undefined;
}

export function setPrice(value: PricingConfig, path: string[], amount: number) {
  let current = value as unknown as Record<string, unknown>;
  for (const key of path.slice(0, -1)) {
    if (!current[key]) current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = amount;
}

export function validatePricing(value: unknown): PricingConfig {
  const result = {} as PricingConfig;
  for (const group of PRICING_GROUPS) {
    for (const field of group.fields) {
      const amount = readPrice(value, field.path);
      const minimum = field.path[field.path.length - 1] === "minimum" ? MINIMUM_VISIT_PRICE : 0;
      if (amount === undefined || !Number.isFinite(amount) || amount < minimum || amount > 10_000_000) {
        throw new Error(`Некорректная цена: ${field.label}. Допустимо от ${minimum} до 10 000 000 ₽`);
      }
      setPrice(result, field.path, Math.round(amount * 100) / 100);
    }
  }
  return result;
}

// Read old saved rows during rollout; writes still require the complete schema.
export function normalizePricing(value: unknown): PricingConfig {
  const normalized = structuredClone(value);
  if (normalized && typeof normalized === "object") {
    const cleaning = (normalized as Record<string, unknown>).cleaning;
    if (cleaning && typeof cleaning === "object" && !("facadeGeneral" in cleaning)) {
      const rate = readPrice(normalized, ["cleaning", "general", "rate"]);
      if (rate !== undefined && Number.isFinite(rate) && rate >= 0) {
        (cleaning as Record<string, unknown>).facadeGeneral = {
          standardRate: Math.round(370 * rate / BASE_GENERAL_RATE / 10) * 10,
          panoramicRate: Math.round(450 * rate / BASE_GENERAL_RATE / 10) * 10,
          minimum: MINIMUM_VISIT_PRICE,
        };
      }
    }
  }
  return validatePricing(normalized);
}
