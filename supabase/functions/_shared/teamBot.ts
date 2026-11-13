// Логика командного бота без сети: что изменилось с прошлой проверки и какие сообщения отправить.
// В чат уходят только достижения: заказы, «узнавали цену», выполнения и отмены здесь не рассылаются.
import type { AchievementsResult } from "./achievements.ts";

export type BotState = {
  initialized: boolean;
  achievements: string[];
  revealed: boolean;
};

export const emptyState = (): BotState => ({ initialized: false, achievements: [], revealed: false });

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (value: number) => `${Math.round(value).toLocaleString("ru-RU").replace(/ /g, " ")} ₽`;
const day = (date: string) => date.split("-").reverse().slice(0, 2).join(".");

export function buildNotifications(state: BotState, data: { achievements: AchievementsResult }) {
  const next: BotState = {
    initialized: true,
    achievements: data.achievements.achievements.filter((item) => item.done).map((item) => item.id),
    revealed: data.achievements.revealed,
  };
  // Первая проверка только запоминает текущее состояние, чтобы не засыпать чат историей.
  if (!state.initialized) return { messages: [] as string[], next };

  const messages: string[] = [];
  const achievements = data.achievements;
  if (achievements.revealed && !state.revealed) {
    const done = achievements.achievements.filter((item) => item.done);
    const rank = { summit: 0, gold: 1, silver: 2, bronze: 3 } as const;
    const highlights = done.filter((item) => item.cat !== "Восхождение" && !item.hidden).sort((a, b) => rank[a.tier] - rank[b.tier]).slice(0, 8);
    const by = achievements.revealedBy;
    messages.push([
      `🏆 <b>Достижения «Вершины» открыты: +${done.length}</b>`,
      by ? `Их открыл заказ в городе ${escape(by.city)} ${day(by.date)}.` : "",
      "",
      ...highlights.map((item) => `• <b>${escape(item.name)}</b> — ${escape(item.desc)}`),
      "",
      "Все ачивки — кубок в калькуляторе chisto23.ru/calc",
    ].filter((line, index, list) => line || list[index - 1]).join("\n"));
  } else if (achievements.revealed) {
    const known = new Set(state.achievements);
    const fresh = achievements.achievements.filter((item) => item.done && !known.has(item.id));
    if (fresh.length) messages.push(fresh.length === 1
      ? `🏆 <b>Новое достижение: ${escape(fresh[0].name)}</b>\n${escape(fresh[0].desc)}`
      : `🏆 <b>Новые достижения: ${fresh.length}</b>\n${fresh.slice(0, 12).map((item) => `• <b>${escape(item.name)}</b> — ${escape(item.desc)}`).join("\n")}`);
  }

  return { messages, next };
}

export function achievementsSummary(result: AchievementsResult) {
  const list = result.achievements;
  const done = list.filter((item) => item.done).length;
  if (!result.revealed) {
    return `🔒 <b>Достижения пока закрыты</b>\n${list.length} ачивок ждут первого выполненного заказа. Он откроет всё, что сеть уже накопила.`;
  }
  const near = list.filter((item) => !item.done && item.progress && item.progress[0] > 0 && !item.hidden)
    .map((item) => ({ item, ratio: item.progress![0] / item.progress![1] })).sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  return [
    `🏆 <b>Получено ${done} из ${list.length}</b> (${Math.round(done / list.length * 100)}%)`,
    result.stats ? `${result.stats.orders} заказов · ${money(result.stats.revenue)} выручки · ${result.stats.citiesWithOrders} городов с заказами` : "",
    "",
    "<b>Ближе всего:</b>",
    ...near.map(({ item, ratio }) => `• ${escape(item.name)} — ${Math.round(ratio * 100)}%`),
  ].filter((line, index) => line || index > 0).join("\n");
}

export function parseCommand(text: string | undefined) {
  const match = (text || "").trim().match(/^\/([a-z_]+)(?:@\w+)?(?:\s+(.*))?$/i);
  return match ? { command: match[1].toLowerCase(), argument: (match[2] || "").trim() } : null;
}

/** Секрет вебхука выводится из токена, чтобы не заводить отдельный секрет. */
export async function webhookSecret(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`vershina-team-bot:${token}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 48);
}
