export const ADVERTISING_CHANNELS = ["Яндекс Директ", "Авито", "Повторный клиент"] as const;
export const INTAKE_CHANNELS = ["Телефон", "Max", "Telegram", "WhatsUp", "Авито"] as const;

export type AcquisitionChannels = {
  advertisingChannel: (typeof ADVERTISING_CHANNELS)[number];
  intakeChannel: (typeof INTAKE_CHANNELS)[number];
};

export function hasAcquisitionChannels(value: { advertisingChannel?: unknown; intakeChannel?: unknown }): value is AcquisitionChannels {
  return ADVERTISING_CHANNELS.some((channel) => channel === value.advertisingChannel)
    && INTAKE_CHANNELS.some((channel) => channel === value.intakeChannel);
}

export function validateAcquisitionChannels(value: { advertisingChannel?: unknown; intakeChannel?: unknown }): AcquisitionChannels {
  if (!hasAcquisitionChannels(value)) throw new Error("Выберите рекламный канал и канал поступления");
  return { advertisingChannel: value.advertisingChannel, intakeChannel: value.intakeChannel };
}

// Retain the client-data layout, but always use the server-validated values.
// If an older description has no channel rows, add them before the creation date.
export function withAcquisitionChannels(description: string, channels: AcquisitionChannels): string {
  let result = description;
  for (const [label, value] of [["Рекламный канал", channels.advertisingChannel], ["Канал поступления", channels.intakeChannel]]) {
    const pattern = new RegExp(`^${label}:.*$`, "gm");
    const row = `${label}: ${value}`;
    result = pattern.test(result) ? result.replace(pattern, row) : `${result}\n${row}`;
  }
  return result;
}
