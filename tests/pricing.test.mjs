import test from "node:test";
import assert from "node:assert/strict";
import { CITIES, PRICING_GROUPS, validateCityId, validatePricing, setPrice } from "../supabase/functions/_shared/pricing.ts";
import { calculateOrderTotal } from "../src/internal-calc/orderTotal.ts";

test("Минимум применяется один раз к общей сумме услуг", () => {
  // The user's example: 37 m² × 280 ₽, plus 9 700 ₽ of services.
  assert.deepEqual(calculateOrderTotal([{ sum: 37 * 280 }, { sum: 9700 }], 12000, true), {
    subtotal: 20060, total: 20060, minimumAdjustment: 0,
  });
  assert.deepEqual(calculateOrderTotal([{ sum: 5000 }, { sum: 2000 }], 12000, true), {
    subtotal: 7000, total: 12000, minimumAdjustment: 5000,
  });
  assert.equal(calculateOrderTotal([{ sum: 10000 }, { sum: 2000 }], 12000, true).minimumAdjustment, 0);
  assert.equal(calculateOrderTotal([{ sum: 2000 }], 12000, false).total, 2000);
  assert.equal(calculateOrderTotal([], 12000, false).total, 0);
  assert.equal(calculateOrderTotal([{ sum: 37 * 280 * 2 }, { sum: 1000 }], 12000, true).total, 21720);
  assert.equal(calculateOrderTotal([{ sum: 1000 }, { sum: 2500 }, { sum: 1500 }], 6000, true).total, 6000);
  assert.equal(calculateOrderTotal([{ sum: 1000 }], 0, true).total, 1000);
});

const pricing = {};
for (const group of PRICING_GROUPS) for (const field of group.fields) setPrice(pricing, field.path, 100);

test("49 тарифов, города, округление и совместимость старого прайса", () => {
  assert.equal(PRICING_GROUPS.flatMap((group) => group.fields).length, 49);
  for (const city of CITIES) assert.equal(validateCityId(city.id), city.id);
  assert.throws(() => validateCityId("default"));
  const input = structuredClone(pricing);
  input.cleaning.wet.rate = 123.456;
  delete input.special.kitchen;
  input.unknown = "discard";
  const validated = validatePricing(input);
  assert.equal(validated.cleaning.wet.rate, 123.46);
  assert.equal(validated.special.kitchen, 7000);
  assert.equal(validated.unknown, undefined);
  for (const invalid of [-1, Infinity, NaN, 10000001, "100", null, undefined]) {
    const bad = structuredClone(pricing); bad.cleaning.wet.rate = invalid;
    assert.throws(() => validatePricing(bad));
  }
  assert.throws(() => validatePricing({}));
});

test("API: PIN, изоляция городов, создание, обновление, конфликт, копирование", async () => {
  let handler;
  const originalFetch = globalThis.fetch, originalDeno = globalThis.Deno;
  const rows = new Map([["default", { data: structuredClone(pricing), updated_at: "2026-01-01T00:00:00.000Z" }]]);
  globalThis.Deno = {
    env: { get: (key) => ({ CALC_PIN: "test-pin", PRICING_ADMIN_PIN: "test-pin", SUPABASE_URL: "https://test.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-key" })[key] },
    serve: (callback) => { handler = callback; },
  };
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input), method = options.method || "GET";
    assert.equal(url.origin, "https://test.invalid");
    assert.equal(options.headers.apikey, "test-key");
    const id = url.searchParams.get("id")?.slice(3);
    if (method === "GET") return Response.json(rows.has(id) ? [rows.get(id)] : []);
    const body = JSON.parse(options.body);
    if (method === "POST") {
      if (rows.has(body.id)) return Response.json({}, { status: 409 });
      const row = { data: body.data, updated_at: body.updated_at };
      rows.set(body.id, row); return Response.json([row]);
    }
    assert.equal(method, "PATCH");
    if (!rows.has(id) || rows.get(id).updated_at !== url.searchParams.get("updated_at")?.slice(3)) return Response.json([]);
    rows.set(id, { data: body.data, updated_at: body.updated_at }); return Response.json([rows.get(id)]);
  };
  try {
    await import("../supabase/functions/manager-calc/index.ts");
    const request = async (action, payload, { pin = "test-pin", origin = "https://chisto23.ru" } = {}) => {
      const result = await handler(new Request("https://function.invalid", { method: "POST", headers: { "content-type": "application/json", "x-calc-pin": pin, origin }, body: JSON.stringify({ action, payload }) }));
      return { status: result.status, ...await result.json() };
    };
    assert.equal((await request("pricing.get", undefined, { pin: "wrong" })).status, 401);
    assert.equal((await request("pricing.get", undefined, { origin: "https://evil.invalid" })).status, 403);
    assert.deepEqual((await request("pricing.get")).data, pricing);
    const inherited = (await request("pricing.settings.get", { cityId: "lipetsk" })).data;
    assert.equal(inherited.inherited, true); assert.equal(inherited.updatedAt, null);
    assert.deepEqual(inherited.pricing, pricing);
    const payload = { cityId: "lipetsk", adminPin: "test-pin", pricing: structuredClone(pricing), expectedUpdatedAt: null };
    assert.equal((await request("pricing.settings.save", { ...payload, adminPin: "wrong" })).status, 400);
    assert.equal((await request("pricing.settings.save", { ...payload, cityId: "default" })).status, 400);
    assert.equal((await request("pricing.settings.save", { ...payload, pricing: {} })).status, 400);
    payload.pricing.cleaning.wet.rate = 160;
    const created = await request("pricing.settings.save", payload);
    assert.equal(created.status, 200); assert.equal(created.data.inherited, false);
    assert.equal((await request("pricing.get", { cityId: "lipetsk" })).data.cleaning.wet.rate, 160);
    assert.equal((await request("pricing.get", { cityId: "sochi" })).data.cleaning.wet.rate, 100);
    assert.equal((await request("pricing.settings.save", payload)).status, 400);
    const updated = await request("pricing.settings.save", { ...payload, expectedUpdatedAt: created.data.updatedAt });
    assert.equal(updated.status, 200);
    assert.equal((await request("pricing.settings.save", { ...payload, expectedUpdatedAt: "2026-01-01T00:00:00Z" })).status, 400);
    assert.equal((await request("pricing.settings.save", { ...payload, expectedUpdatedAt: undefined })).status, 400);
    const copied = await request("pricing.settings.save", { ...payload, cityId: "voronezh", pricing: updated.data.pricing });
    assert.equal(copied.status, 200);
    assert.deepEqual((await request("pricing.get", { cityId: "voronezh" })).data, updated.data.pricing);
    assert.deepEqual(rows.get("default").data, pricing);
  } finally { globalThis.fetch = originalFetch; globalThis.Deno = originalDeno; }
});
