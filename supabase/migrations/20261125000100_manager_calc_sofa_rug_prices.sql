-- Reprice only the standard sofa and rug. Preserve the established dry-cleaning
-- coefficients (Balashikha 1.20, Salekhard/Novy Urengoy 1.12), rounded to 10 RUB.
do $$
declare
  city_prices record;
  multiplier numeric;
  updated_prices jsonb;
begin
  for city_prices in select id, data from public.manager_calc_pricing for update
  loop
    if jsonb_typeof(city_prices.data->'dry') is distinct from 'object' then
      raise exception 'Missing dry-cleaning pricing for %', city_prices.id;
    end if;
    multiplier := case
      when city_prices.id = 'balashikha' then 1.20
      when city_prices.id in ('salekhard', 'novy-urengoy') then 1.12
      else 1
    end;
    updated_prices := jsonb_set(jsonb_set(city_prices.data,
      '{dry,sofa}', to_jsonb(round(4900 * multiplier / 10) * 10)),
      '{dry,rug}', to_jsonb(round(400 * multiplier / 10) * 10));
    update public.manager_calc_pricing
      set data = updated_prices, updated_at = now()
      where id = city_prices.id and data is distinct from updated_prices;
  end loop;
end;
$$;
