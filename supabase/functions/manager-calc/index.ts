type CalendarPayload = {
  summary: string;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "https://chisto23.ru,https://www.chisto23.ru,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-headers": "authorization, apikey, content-type, x-calc-pin",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin",
  };
}

function response(origin: string | null, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...corsHeaders(origin) },
  });
}

function base64Url(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function privateKeyBytes(pem: string) {
  const encoded = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getGoogleAccessToken() {
  const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
  if (!serviceAccountEmail || !privateKey) {
    throw new Error("Google Calendar не настроен на сервере");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error("Google token exchange failed", tokenResponse.status, tokenData.error);
    throw new Error("Google не выдал доступ к календарю");
  }
  return tokenData.access_token as string;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validateCalendarPayload(value: unknown): CalendarPayload {
  const payload = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const result = {
    summary: cleanText(payload.summary, 180),
    description: cleanText(payload.description, 12000),
    location: cleanText(payload.location, 500),
    startDateTime: cleanText(payload.startDateTime, 30),
    endDateTime: cleanText(payload.endDateTime, 30),
    timeZone: cleanText(payload.timeZone, 80),
  };
  if (!result.summary || !result.description || !result.location || !result.startDateTime || !result.endDateTime || !result.timeZone) {
    throw new Error("Не заполнены обязательные данные события");
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(result.startDateTime) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(result.endDateTime)) {
    throw new Error("Некорректная дата события");
  }
  return result;
}

async function getPricing() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase не настроен");
  const headers: Record<string, string> = { apikey: serviceRoleKey };
  if (serviceRoleKey.startsWith("eyJ")) headers.authorization = `Bearer ${serviceRoleKey}`;
  const pricingResponse = await fetch(`${supabaseUrl}/rest/v1/manager_calc_pricing?id=eq.default&select=data&limit=1`, { headers });
  if (!pricingResponse.ok) throw new Error("Не удалось загрузить цены");
  const rows = await pricingResponse.json() as Array<{ data: unknown }>;
  return rows[0]?.data || null;
}

async function createGoogleCalendarEvent(payloadValue: unknown) {
  const payload = validateCalendarPayload(payloadValue);
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
  if (!calendarId) throw new Error("Календарь не настроен на сервере");
  const accessToken = await getGoogleAccessToken();
  const eventResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary: payload.summary,
        description: payload.description,
        location: payload.location,
        colorId: Deno.env.get("GOOGLE_CALENDAR_COLOR_ID") || "7",
        start: { dateTime: payload.startDateTime, timeZone: payload.timeZone },
        end: { dateTime: payload.endDateTime, timeZone: payload.timeZone },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
      }),
    },
  );
  const event = await eventResponse.json();
  if (!eventResponse.ok) {
    console.error("Calendar event creation failed", eventResponse.status, event.error?.status);
    throw new Error("Google Calendar отклонил событие");
  }
  return { id: event.id as string, htmlLink: event.htmlLink as string | undefined };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return response(origin, 405, { ok: false, error: "Метод не поддерживается" });
  if (origin && !allowedOrigins.includes(origin)) return response(origin, 403, { ok: false, error: "Источник запроса запрещён" });

  const expectedPin = Deno.env.get("CALC_PIN");
  const providedPin = request.headers.get("x-calc-pin");
  if (!expectedPin || providedPin !== expectedPin) return response(origin, 401, { ok: false, error: "Неверный PIN-код" });

  try {
    const body = await request.json() as { action?: string; payload?: unknown };
    if (body.action === "pricing.get") return response(origin, 200, { ok: true, data: await getPricing() });
    if (body.action === "calendar.create") return response(origin, 200, { ok: true, data: await createGoogleCalendarEvent(body.payload) });
    return response(origin, 400, { ok: false, error: "Неизвестное действие" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Внутренняя ошибка";
    console.error("manager-calc error", message);
    return response(origin, 400, { ok: false, error: message });
  }
});
