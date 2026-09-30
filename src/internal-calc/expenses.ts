export const calculateDefaultExpenses = (clientPrice: number) =>
  Math.round(Math.max(0, clientPrice) * 0.65 / 100) * 100;
