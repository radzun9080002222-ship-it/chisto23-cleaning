// Доступ к Google Calendar и Sheets от имени service account. Ключи только в секретах Supabase.
import type { CalendarEventInput } from "./achievements.ts";

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const DEFAULT_SHEET_ID = "1ey9GDuVRXo2tqu_UVbSdSUdUZN_-3rezQR2jHPNAMrM";

function base64Url(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function privateKeyBytes(pem: string) {
  const encoded = pem.replace(/\\n/g, "\n").replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
}

export async function getGoogleAccessToken(scope: string) {
  const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
  if (!email || !privateKey) throw new Error("Google не настроен на сервере");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({ iss: email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))}`;
  const key = await crypto.subtle.importKey("pkcs8", privateKeyBytes(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const result = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}` }),
  });
  const data = await result.json();
  if (!result.ok || !data.access_token) throw new Error("Google не выдал доступ");
  return data.access_token as string;
}

export async function fetchCalendarEvents(accessToken: string) {
  const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
  if (!calendarId) throw new Error("Календарь не настроен на сервере");
  const events: CalendarEventInput[] = [];
  const timeMax = new Date(Date.now() + 120 * 86400000).toISOString();
  let pageToken = "";
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      timeMin: "2026-07-01T00:00:00Z", timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "2500",
      fields: "items(id,status,eventType,summary,description,location,created,start),nextPageToken",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, { headers: { authorization: `Bearer ${accessToken}` } });
    const data = await result.json();
    if (!result.ok) throw new Error("Не удалось прочитать календарь");
    events.push(...(data.items || []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return events;
}

export async function fetchSheetRows(accessToken: string) {
  const sheetId = Deno.env.get("GOOGLE_SHEET_ID") || DEFAULT_SHEET_ID;
  const range = Deno.env.get("GOOGLE_SHEET_RANGE") || "A:H";
  const result = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!result.ok) { console.error("Sheet read failed", result.status); return null; }
  const data = await result.json() as { values?: string[][] };
  return data.values || null;
}
