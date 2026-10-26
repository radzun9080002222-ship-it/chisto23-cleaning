// Командный Telegram-бот «Вершины»: заказы, расчёты, выполнения и достижения в чат команды.
// Токен бота — только в секрете TELEGRAM_BOT_TOKEN, в Git его нет.
import { computeAchievements, parseCalendar } from "../_shared/achievements.ts";
import { CALENDAR_SCOPE, SHEETS_SCOPE, fetchCalendarEvents, fetchSheetRows, getGoogleAccessToken } from "../_shared/google.ts";
import { achievementsSummary, buildNotifications, emptyState, parseCommand, webhookSecret, type BotState } from "../_shared/teamBot.ts";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

function botToken() {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Не задан секрет TELEGRAM_BOT_TOKEN");
  return token;
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const result = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  });
  const data = await result.json().catch(() => ({}));
  if (!data.ok) console.error("Telegram error", method, data.error_code, data.description);
  return data;
}

const send = (chatId: number, text: string) => telegram("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });

function db(table: string) {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase не настроен");
  const headers: Record<string, string> = { apikey: key, "content-type": "application/json" };
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  return { url: `${url}/rest/v1/${table}`, headers };
}

async function chats(): Promise<number[]> {
  const { url, headers } = db("team_bot_chats");
  const result = await fetch(`${url}?select=chat_id`, { headers });
  if (!result.ok) throw new Error(`Не удалось прочитать чаты бота (${result.status}: ${(await result.text()).slice(0, 200)})`);
  return (await result.json() as { chat_id: number }[]).map((row) => Number(row.chat_id));
}

async function readState<T>(key: string, fallback: T): Promise<T> {
  const { url, headers } = db("team_bot_state");
  const result = await fetch(`${url}?key=eq.${encodeURIComponent(key)}&select=value`, { headers });
  if (!result.ok) throw new Error(`Не удалось прочитать состояние бота (${result.status}: ${(await result.text()).slice(0, 200)})`);
  const rows = await result.json() as { value: T }[];
  return rows[0]?.value ?? fallback;
}

async function writeState(key: string, value: unknown) {
  const { url, headers } = db("team_bot_state");
  await fetch(url, { method: "POST", headers: { ...headers, prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }) });
}

async function loadData() {
  const accessToken = await getGoogleAccessToken(`${CALENDAR_SCOPE} ${SHEETS_SCOPE}`);
  const [events, sheetRows] = await Promise.all([fetchCalendarEvents(accessToken), fetchSheetRows(accessToken)]);
  const { orders, inquiries } = parseCalendar(events);
  return { orders, inquiries, achievements: computeAchievements({ events, sheetRows }) };
}

async function tick() {
  const targets = await chats();
  if (!targets.length) return { chats: 0, sent: 0 };
  const state = await readState<BotState>("notifications", emptyState());
  const { messages, next } = buildNotifications(state, await loadData());
  for (const chatId of targets) for (const message of messages) await send(chatId, message);
  await writeState("notifications", next);
  return { chats: targets.length, sent: messages.length };
}

const HELP = [
  "<b>Бот команды «Вершины»</b>",
  "Присылает в этот чат новые заказы, расчёты «узнавали цену», выполнения, отмены и достижения.",
  "",
  "/start PIN — подключить чат (PIN как в калькуляторе)",
  "/ach — сводка по достижениям",
  "/stop — отключить уведомления в этом чате",
].join("\n");

async function handleUpdate(update: { message?: { chat: { id: number; title?: string; first_name?: string }; text?: string } }) {
  const message = update.message;
  const parsed = parseCommand(message?.text);
  if (!message || !parsed) return;
  const chatId = message.chat.id;
  const registered = (await chats()).includes(chatId);

  if (parsed.command === "start") {
    if (registered) return send(chatId, `Этот чат уже подключён.\n\n${HELP}`);
    const fails = await readState<{ count: number; day: string }>(`fails:${chatId}`, { count: 0, day: "" });
    const today = new Date().toISOString().slice(0, 10);
    if (fails.day === today && fails.count >= 5) return send(chatId, "Слишком много попыток. Попробуйте завтра.");
    if (!parsed.argument) return send(chatId, "Чтобы подключить чат, отправьте /start и PIN калькулятора одним сообщением.");
    if (parsed.argument !== Deno.env.get("CALC_PIN")) {
      await writeState(`fails:${chatId}`, { count: fails.day === today ? fails.count + 1 : 1, day: today });
      return send(chatId, "PIN не подошёл.");
    }
    const { url, headers } = db("team_bot_chats");
    await fetch(url, { method: "POST", headers: { ...headers, prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ chat_id: chatId, title: message.chat.title || message.chat.first_name || "" }) });
    return send(chatId, `✅ Чат подключён.\n\n${HELP}`);
  }
  if (parsed.command === "help") return send(chatId, HELP);
  if (!registered) return send(chatId, "Чат не подключён. Отправьте /start и PIN калькулятора.");
  if (parsed.command === "stop") {
    const { url, headers } = db("team_bot_chats");
    await fetch(`${url}?chat_id=eq.${chatId}`, { method: "DELETE", headers });
    return send(chatId, "Уведомления в этом чате отключены. Вернуть: /start PIN");
  }
  if (parsed.command === "ach") return send(chatId, achievementsSummary((await loadData()).achievements));
}

async function setup(request: Request) {
  const url = new URL(request.url);
  const hook = `${Deno.env.get("SUPABASE_URL") || url.origin}/functions/v1/team-bot`;
  const webhook = await telegram("setWebhook", { url: hook, secret_token: await webhookSecret(botToken()), allowed_updates: ["message"], drop_pending_updates: true });
  await telegram("setMyCommands", { commands: [
    { command: "start", description: "Подключить чат: /start PIN" },
    { command: "ach", description: "Сводка по достижениям" },
    { command: "stop", description: "Отключить уведомления" },
    { command: "help", description: "Что умеет бот" },
  ] });
  const me = await telegram("getMe", {});
  return { webhook: Boolean(webhook.ok), bot: me.result?.username || null };
}

Deno.serve(async (request) => {
  const url = new URL(request.url);
  try {
    if (url.searchParams.has("setup")) return json(200, { ok: true, ...(await setup(request)) });
    if (url.searchParams.has("tick")) return json(200, { ok: true, ...(await tick()) });
    if (request.method === "POST" && request.headers.get("x-telegram-bot-api-secret-token")) {
      if (request.headers.get("x-telegram-bot-api-secret-token") !== await webhookSecret(botToken())) return json(401, { ok: false });
      await handleUpdate(await request.json());
      return json(200, { ok: true });
    }
    return json(404, { ok: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Внутренняя ошибка";
    console.error("team-bot error", message);
    return json(500, { ok: false, error: message });
  }
});
