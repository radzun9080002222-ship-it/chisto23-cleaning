import type { PricingConfig } from "../../supabase/functions/_shared/pricing.ts";

export type CleaningType = keyof PricingConfig["cleaning"];
export type GlassType = "standard" | "panoramic";

export const CLEANING_LABELS: Record<CleaningType, string> = {
  wet: "Влажная уборка",
  general: "Генеральная уборка",
  repair: "После ремонта",
  facadeGeneral: "Фасадная генеральная с окнами",
  allInclusive: "Всё включено",
};

export function includesWindows(type: CleaningType): type is "facadeGeneral" | "allInclusive" {
  return type === "facadeGeneral" || type === "allInclusive";
}

export function cleaningTariff(pricing: PricingConfig, type: CleaningType, glassType: GlassType) {
  const tariff = pricing.cleaning[type];
  const rate = "rate" in tariff ? tariff.rate : glassType === "panoramic" ? tariff.panoramicRate : tariff.standardRate;
  return { rate, minimum: tariff.minimum };
}

export function cleaningLabel(type: CleaningType, glassType: GlassType): string {
  return CLEANING_LABELS[type] + (includesWindows(type) ? ` (${glassType === "panoramic" ? "панорамные окна" : "стандартные окна"})` : "");
}
