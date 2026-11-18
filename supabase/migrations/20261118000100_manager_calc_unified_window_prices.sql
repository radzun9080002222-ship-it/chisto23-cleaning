-- Use each saved city's ordinary window rates for post-renovation washing too.
-- Keep every other service and each city's existing ordinary rates unchanged.
do $$
declare
  city_prices record;
  unified_windows jsonb;
begin
  for city_prices in select id, data from public.manager_calc_pricing for update
  loop
    if jsonb_typeof(city_prices.data->'windows') is distinct from 'object' then
      raise exception 'Missing window pricing for %', city_prices.id;
    end if;
    if exists (select 1 from jsonb_each(city_prices.data->'windows') w
      where jsonb_typeof(w.value->'usual') is distinct from 'number') then
      raise exception 'Invalid ordinary window pricing for %', city_prices.id;
    end if;
    select jsonb_object_agg(w.key, jsonb_set(w.value, '{repair}', w.value->'usual'))
      into unified_windows from jsonb_each(city_prices.data->'windows') w;
    if unified_windows is null then raise exception 'Empty window pricing for %', city_prices.id; end if;
    update public.manager_calc_pricing
      set data = jsonb_set(data, '{windows}', unified_windows), updated_at = now()
      where id = city_prices.id and data->'windows' is distinct from unified_windows;
  end loop;
end;
$$;
