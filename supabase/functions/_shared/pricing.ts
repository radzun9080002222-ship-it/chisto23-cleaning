export type PricingConfig = {
  cleaning: {
    wet: { rate: number; minimum: number };
    general: { rate: number; minimum: number };
    repair: { rate: number; minimum: number };
    allInclusive: { standardRate: number; panoramicRate: number; minimum: number };
  };
  windows: Record<string, { usual: number; repair: number }>;
  extras: Record<string, number>;
  dry: Record<string, number>;
  special: { bathroom: number; mold: number; remoteTrip: number; kitchen?: number };
};

export const CITIES = [
  { id: "sochi", label: "Сочи", timeZone: "Europe/Moscow" },
  { id: "lipetsk", label: "Липецк", timeZone: "Europe/Moscow" },
  { id: "novy-urengoy", label: "Новый Уренгой", timeZone: "Asia/Yekaterinburg" },
  { id: "moscow", label: "Москва", timeZone: "Europe/Moscow" },
  { id: "salekhard", label: "Салехард", timeZone: "Asia/Yekaterinburg" },
  { id: "voronezh", label: "Воронеж", timeZone: "Europe/Moscow" },
  { id: "ryazan", label: "Рязань", timeZone: "Europe/Moscow" },
  { id: "abkhazia", label: "Абхазия", timeZone: "Europe/Moscow" },
] as const;

export type CityId = (typeof CITIES)[number]["id"];
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
    ["sofa", "Диван стандарт"], ["corner", "Диван угловой"], ["sofa3", "Диван трёхместный"],
    ["mattress1", "Матрас односпальный · 1 сторона"], ["mattress2", "Матрас двухспальный · 1 сторона"],
    ["headboard", "Кровать · изголовье"], ["bedside", "Кровать · тканевый борт"], ["pillow", "Подушка"],
    ["armchair", "Кресло"], ["bench", "Банкетка"], ["pouf", "Пуфик"], ["chair", "Стул"],
    ["rug", "Ковёр · ₽/м²"], ["carpet", "Ковролин · ₽/м²"],
  ]) },
  { title: "Особые условия", fields: unitFields("special", [
    ["bathroom", "Дополнительный санузел"], ["mold", "Обработка плесени"],
    ["remoteTrip", "Удалённый выезд"], ["kitchen", "Выезд только на кухню"],
  ]) },
];

export function validateCityId(value: unknown): CityId {
  if (typeof value !== "string" || !CITIES.some((city) => city.id === value)) {
    throw new Error("Выберите город из списка");
  }
  return value as CityId;
}

export function readPrice(value: unknown, path: string[]): number | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  if (current === undefined && path.join(".") === "special.kitchen") return 7000;
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
      if (amount === undefined || !Number.isFinite(amount) || amount < 0 || amount > 10_000_000) {
        throw new Error(`Некорректная цена: ${field.label}. Допустимо от 0 до 10 000 000 ₽`);
      }
      setPrice(result, field.path, Math.round(amount * 100) / 100);
    }
  }
  return result;
}
