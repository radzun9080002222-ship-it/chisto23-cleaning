-- Round the recently indexed services to the nearest 10 RUB. Preserve ordinary
-- city prices, cleaning rates, special conditions and any other saved settings.
do $$
declare
  city_prices record;
  rounded_windows jsonb;
  rounded_extras jsonb;
  rounded_dry jsonb;
begin
  for city_prices in
    select id, data from public.manager_calc_pricing
    where id in ('balashikha', 'salekhard', 'novy-urengoy')
  loop
    select jsonb_object_agg(w.key, (
      select jsonb_object_agg(p.key, round(p.value::numeric / 10) * 10)
      from jsonb_each_text(w.value) p
    )) into rounded_windows from jsonb_each(city_prices.data->'windows') w;

    select jsonb_object_agg(p.key, round(p.value::numeric / 10) * 10)
    into rounded_extras from jsonb_each_text(city_prices.data->'extras') p;

    select jsonb_object_agg(p.key, round(p.value::numeric / 10) * 10)
    into rounded_dry from jsonb_each_text(city_prices.data->'dry') p;

    if rounded_windows is null or rounded_extras is null or rounded_dry is null then
      raise exception 'Missing indexed services for %', city_prices.id;
    end if;

    update public.manager_calc_pricing
    set data = jsonb_set(jsonb_set(jsonb_set(data,
          '{windows}', rounded_windows), '{extras}', rounded_extras), '{dry}', rounded_dry),
        updated_at = now()
    where id = city_prices.id;
  end loop;
end;
$$;
