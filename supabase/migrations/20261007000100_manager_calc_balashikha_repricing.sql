update public.manager_calc_pricing
set
  data = jsonb_set(
    data,
    '{cleaning}',
    '{
      "wet": {"rate": 190, "minimum": 7200},
      "general": {"rate": 300, "minimum": 10800},
      "repair": {"rate": 360, "minimum": 14400},
      "allInclusive": {"standardRate": 540, "panoramicRate": 660, "minimum": 14400}
    }'::jsonb,
    true
  ),
  updated_at = now()
where id = 'balashikha';
