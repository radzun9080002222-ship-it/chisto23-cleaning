// The cleaning minimum covers the entire order, including windows and extras.
// A standalone service order must not inherit the selected cleaning tab's minimum.
export function calculateOrderTotal(lines: ReadonlyArray<{ sum: number }>, minimum: number, hasCleaning: boolean) {
  const subtotal = lines.reduce((sum, line) => sum + line.sum, 0);
  const total = hasCleaning ? Math.max(subtotal, minimum) : subtotal;
  return { subtotal, total, minimumAdjustment: total - subtotal };
}
