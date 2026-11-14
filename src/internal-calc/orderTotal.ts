import { MINIMUM_VISIT_PRICE } from "../../supabase/functions/_shared/pricing.ts";

// A single minimum covers the whole visit, including standalone windows or dry cleaning.
export function calculateOrderTotal(lines: ReadonlyArray<{ sum: number }>, minimum: number, hasCleaning: boolean) {
  const subtotal = lines.reduce((sum, line) => sum + line.sum, 0);
  const total = lines.length ? Math.max(subtotal, MINIMUM_VISIT_PRICE, hasCleaning ? minimum : 0) : 0;
  return { subtotal, total, minimumAdjustment: total - subtotal };
}

export function calculateClientPrice(manualPrice: number | null, priceListTotal: number, hasServices: boolean) {
  return Math.max(manualPrice ?? priceListTotal, hasServices ? MINIMUM_VISIT_PRICE : 0);
}
