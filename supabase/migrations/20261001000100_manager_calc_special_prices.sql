update public.manager_calc_pricing
set
  data = jsonb_set(
    jsonb_set(data, '{special,kitchen}', '6000'::jsonb, true),
    '{special,cabinet}', '1000'::jsonb, true
  ),
  updated_at = timezone('utc', now());
