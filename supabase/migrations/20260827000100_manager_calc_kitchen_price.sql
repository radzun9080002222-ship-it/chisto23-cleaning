update public.manager_calc_pricing
set
  data = jsonb_set(
    jsonb_set(data, '{special,kitchen}', '7000'::jsonb, true),
    '{windows,panoramic}',
    '{"usual": 1000, "repair": 1000}'::jsonb,
    true
  ),
  updated_at = now()
where id = 'default';
