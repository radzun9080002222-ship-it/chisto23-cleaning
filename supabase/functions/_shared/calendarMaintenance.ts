import { calendarReminderSettings, isCalculatorEvent, needsReminderCleanup, type CalculatorCalendarEvent } from "./calendar.ts";

// Only calculator events are eligible. Preview is the default; each apply call
// changes at most 100 events, with an ETag check against concurrent edits.
export async function disableCalculatorReminders(
  request: typeof fetch, calendarId: string, accessToken: string, apply = false,
) {
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const headers = { authorization: `Bearer ${accessToken}` };
  const candidates: CalculatorCalendarEvent[] = [];
  let pageToken = "", scanned = 0, matched = 0;
  do {
    const query = new URLSearchParams({ maxResults: "2500", showDeleted: "false", fields: "nextPageToken,items(id,etag,status,description,extendedProperties,reminders)" });
    if (pageToken) query.set("pageToken", pageToken);
    const result = await request(`${baseUrl}?${query}`, { headers });
    if (!result.ok) throw new Error("Не удалось проверить напоминания календаря");
    const page = await result.json() as { items?: CalculatorCalendarEvent[]; nextPageToken?: string };
    for (const event of page.items || []) {
      scanned++;
      if (event.status !== "cancelled" && isCalculatorEvent(event)) matched++;
      if (needsReminderCleanup(event)) candidates.push(event);
    }
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  let updated = 0, conflicts = 0, failed = 0;
  if (apply) for (const event of candidates.slice(0, 100)) {
    if (!event.etag) { conflicts++; continue; }
    const result = await request(`${baseUrl}/${encodeURIComponent(event.id)}?sendUpdates=none`, {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json", "if-match": event.etag },
      body: JSON.stringify({ reminders: calendarReminderSettings("none") }),
    });
    if (result.ok) updated++;
    else if (result.status === 412) conflicts++;
    else failed++;
  }
  return { scanned, matched, needingUpdate: candidates.length, updated, conflicts, failed, remaining: candidates.length - updated };
}
