import type { PricingConfig } from "../../supabase/functions/_shared/pricing.ts";

export function buildWindowLines(
  items: ReadonlyArray<{ id: string; label: string }>,
  counts: Record<string, number>,
  prices: PricingConfig["windows"],
  options: { panoramicPrice: number; film: boolean; stickers: boolean; stickerPrice: number },
) {
  let countTotal = 0;
  const lines = items.flatMap((item) => {
    const count = counts[item.id] || 0;
    if (!count) return [];
    countTotal += count;
    const rate = item.id === "panoramic" ? options.panoramicPrice : prices[item.id].usual;
    const label = `${item.label} × ${count}${options.film ? " (плёнка ×2)" : ""}`;
    return [{ label, brigadierLabel: label, sum: Math.round(count * rate * (options.film ? 2 : 1) * 100) / 100, group: "windows" as const }];
  });
  if (options.stickers && countTotal > 0) {
    const label = `С наклейками: ${countTotal} шт. × ${options.stickerPrice} ₽`;
    lines.push({ label, brigadierLabel: label, sum: Math.round(countTotal * options.stickerPrice * 100) / 100, group: "windows" });
  }
  return lines;
}
