import type { CityId, PricingConfig, PricingSnapshot } from "../../supabase/functions/_shared/pricing";
export type { PricingConfig } from "../../supabase/functions/_shared/pricing";

export type CalendarEventPayload = {
  summary: string;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
};

type ManagerResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

const endpoint = import.meta.env.VITE_MANAGER_CALC_URL?.trim();

async function callManager<T>(pin: string, action: string, payload?: unknown): Promise<T> {
  if (!endpoint) {
    throw new Error("Интеграция Supabase ещё не настроена");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-calc-pin": pin,
    },
    body: JSON.stringify({ action, payload }),
  });
  const result = (await response.json().catch(() => null)) as ManagerResponse<T> | null;
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `Ошибка сервера (${response.status})`);
  }
  return result.data as T;
}

export async function loadPricing(pin: string, cityId: CityId): Promise<PricingConfig | null> {
  return callManager<PricingConfig | null>(pin, "pricing.get", { cityId });
}

export const loadPricingSettings = (pin: string, cityId: CityId) =>
  callManager<PricingSnapshot>(pin, "pricing.settings.get", { cityId });

export const saveCityPricing = (pin: string, adminPin: string, cityId: CityId, pricing: PricingConfig, expectedUpdatedAt: string | null) =>
  callManager<PricingSnapshot>(pin, "pricing.settings.save", { cityId, pricing, expectedUpdatedAt, adminPin });

export async function createCalendarEvent(pin: string, payload: CalendarEventPayload) {
  return callManager<{ id: string; htmlLink?: string }>(pin, "calendar.create", payload);
}
