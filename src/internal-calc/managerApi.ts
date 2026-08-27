export type PricingConfig = {
  cleaning: {
    wet: { rate: number; minimum: number };
    general: { rate: number; minimum: number };
    repair: { rate: number; minimum: number };
    allInclusive: {
      standardRate: number;
      panoramicRate: number;
      minimum: number;
    };
  };
  windows: Record<string, { usual: number; repair: number }>;
  extras: Record<string, number>;
  dry: Record<string, number>;
  special: { bathroom: number; mold: number; remoteTrip: number; kitchen?: number };
};

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

export async function loadPricing(pin: string): Promise<PricingConfig | null> {
  return callManager<PricingConfig | null>(pin, "pricing.get");
}

export async function createCalendarEvent(pin: string, payload: CalendarEventPayload) {
  return callManager<{ id: string; htmlLink?: string }>(pin, "calendar.create", payload);
}
