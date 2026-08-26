create table if not exists public.manager_calc_pricing (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.manager_calc_pricing enable row level security;

revoke all on table public.manager_calc_pricing from anon, authenticated;
grant select, insert, update on table public.manager_calc_pricing to service_role;

insert into public.manager_calc_pricing (id, data)
values (
  'default',
  '{
    "cleaning": {
      "wet": {"rate": 160, "minimum": 6000},
      "general": {"rate": 250, "minimum": 9000},
      "repair": {"rate": 300, "minimum": 12000},
      "allInclusive": {"standardRate": 450, "panoramicRate": 550, "minimum": 12000}
    },
    "windows": {
      "panoramic": {"usual": 1200, "repair": 2000},
      "standard": {"usual": 500, "repair": 750},
      "mini": {"usual": 400, "repair": 500},
      "balconyDoor": {"usual": 1200, "repair": 1500}
    },
    "extras": {
      "fridge": 900, "fridge2": 1800, "oven": 900, "microwave": 500,
      "hood": 700, "kitchenCabinet": 250, "curtainsWash": 1500,
      "curtainsIron": 1000, "ironing": 800, "linen": 500,
      "chandelier": 500, "chandelierBig": 1500, "airConditioner": 500, "seams": 3000
    },
    "dry": {
      "sofa": 3500, "corner": 4900, "sofa3": 6500, "mattress1": 1500,
      "mattress2": 2600, "headboard": 1500, "bedside": 1500, "pillow": 500,
      "armchair": 1500, "bench": 1200, "pouf": 550, "chair": 500,
      "rug": 600, "carpet": 550
    },
    "special": {"bathroom": 6000, "mold": 1500, "remoteTrip": 2000}
  }'::jsonb
)
on conflict (id) do nothing;
