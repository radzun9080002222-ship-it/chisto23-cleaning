-- Establish the new ordinary-city sofa prices before deriving elevated prices.
update public.manager_calc_pricing
set data = jsonb_set(data, '{dry}', data->'dry' || '{"sofa":4500,"corner":5900,"sofa3":7300}'::jsonb),
    updated_at = now();

-- Use the saved Sochi price list, or its shared fallback. Rebase each service
-- on ordinary prices rather than compounding previous city-specific markups.
do $$
declare
  base_prices jsonb;
  city_prices record;
  multiplier numeric;
  indexed_windows jsonb;
  indexed_extras jsonb;
  indexed_dry jsonb;
begin
  select data into base_prices from public.manager_calc_pricing
  where id in ('sochi', 'default') order by (id = 'sochi') desc limit 1;
  if base_prices is null or coalesce((base_prices #>> '{cleaning,general,rate}')::numeric, 0) <= 0 then
    raise exception 'The ordinary-city general cleaning rate must be positive';
  end if;

  for city_prices in
    select id, data from public.manager_calc_pricing
    where id in ('balashikha', 'salekhard', 'novy-urengoy')
  loop
    multiplier := (city_prices.data #>> '{cleaning,general,rate}')::numeric
      / (base_prices #>> '{cleaning,general,rate}')::numeric;
    if multiplier is null or multiplier <= 0 then
      raise exception 'Invalid general cleaning rate for %', city_prices.id;
    end if;

    select jsonb_object_agg(w.key, (
      select jsonb_object_agg(p.key, round(p.value::numeric * multiplier))
      from jsonb_each_text(w.value) p
    )) into indexed_windows from jsonb_each(base_prices->'windows') w;

    select jsonb_object_agg(p.key, round(p.value::numeric * multiplier))
    into indexed_extras from jsonb_each_text(base_prices->'extras') p;

    select jsonb_object_agg(p.key, round(p.value::numeric * multiplier))
    into indexed_dry from jsonb_each_text(base_prices->'dry') p;

    update public.manager_calc_pricing
    set data = jsonb_set(jsonb_set(jsonb_set(data,
          '{windows}', indexed_windows), '{extras}', indexed_extras), '{dry}', indexed_dry),
        updated_at = now()
    where id = city_prices.id;
  end loop;
end;
$$;
