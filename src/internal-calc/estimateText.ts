export function buildOrderSummary({ area, cleaningLabel, hasWindows, hasDry, hasOther }: {
  area: number; cleaningLabel: string; hasWindows: boolean; hasDry: boolean; hasOther: boolean;
}) {
  return [
    area > 0 && `${cleaningLabel}, ${area} м²`,
    hasWindows && "Мойка окон",
    hasDry && "Химчистка мебели",
    hasOther && "Дополнительные услуги",
  ].filter(Boolean).join(" + ") || "Клининговые услуги";
}

export function buildBrigadierEstimate(estimateRows: string, totalRows: string, clientRows: string, expenses: number) {
  return `Расчёт стоимости уборки «Вершина»\n\n${estimateRows || "Позиции не выбраны"}\n\n${totalRows}\n\nДанные клиента:\n${clientRows}\n\nЕлена, ваши ${Math.round(expenses).toLocaleString("ru-RU")} рублей`;
}
