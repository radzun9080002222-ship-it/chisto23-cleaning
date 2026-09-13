// Local-only synthetic backend for manual UI checks. Never deploy this file.
import { createServer } from "node:http";
import { PRICING_GROUPS, setPrice } from "../supabase/functions/_shared/pricing.ts";
const pricing = {};
for (const group of PRICING_GROUPS) for (const field of group.fields) setPrice(pricing, field.path, 100);
const rows = new Map([["default", { data: pricing, updated_at: "2026-01-01T00:00:00.000Z" }]]);
let handler;
globalThis.Deno = {
  env: { get: (key) => ({ CALC_PIN: "3715", PRICING_ADMIN_PIN: "3715", SUPABASE_URL: "http://127.0.0.1:5181", SUPABASE_SERVICE_ROLE_KEY: "synthetic" })[key] },
  serve: (callback) => { handler = callback; },
};
await import("../supabase/functions/manager-calc/index.ts");
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1:5181");
    let body = "";
    for await (const chunk of request) body += chunk;
    if (url.pathname.startsWith("/rest/")) {
      const id = url.searchParams.get("id")?.slice(3);
      let result = [];
      if (request.method === "GET") result = rows.has(id) ? [rows.get(id)] : [];
      else {
        const data = JSON.parse(body), key = request.method === "POST" ? data.id : id;
        if (request.method === "POST" && rows.has(key)) { response.writeHead(409); response.end("{}"); return; }
        if (request.method === "POST" || rows.get(key)?.updated_at === url.searchParams.get("updated_at")?.slice(3)) {
          rows.set(key, { data: data.data, updated_at: data.updated_at }); result = [rows.get(key)];
        }
      }
      response.setHeader("content-type", "application/json"); response.end(JSON.stringify(result)); return;
    }
    const result = await handler(new Request(url, { method: request.method, headers: request.headers, ...(body ? { body } : {}) }));
    response.writeHead(result.status, Object.fromEntries(result.headers)); response.end(await result.text());
  } catch (error) { response.writeHead(500); response.end(String(error)); }
}).listen(5181, "127.0.0.1", () => console.log("Synthetic pricing backend: http://127.0.0.1:5181"));
