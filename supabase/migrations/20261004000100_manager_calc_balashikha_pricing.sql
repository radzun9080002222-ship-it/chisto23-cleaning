insert into public.manager_calc_pricing (id, data)
select 'balashikha', data
from public.manager_calc_pricing
where id = 'default'
on conflict (id) do nothing;

update public.manager_calc_pricing
set
  data = jsonb_set(
    data,
    '{cleaning}',
    '{
      "wet": {"rate": 240, "minimum": 9000},
      "general": {"rate": 375, "minimum": 13500},
      "repair": {"rate": 450, "minimum": 18000},
      "allInclusive": {"standardRate": 675, "panoramicRate": 825, "minimum": 18000}
    }'::jsonb,
    true
  ),
  updated_at = now()
where id = 'balashikha';
