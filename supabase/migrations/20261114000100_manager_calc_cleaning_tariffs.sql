-- New ordinary-city rates. Preserve all existing per-m² rates of elevated cities
-- and every non-cleaning group; one 6000 RUB minimum applies to any visit.
do $$
declare
  price_row record;
  cleaning jsonb;
  coefficient numeric;
  service text;
begin
  for price_row in select id, data from public.manager_calc_pricing for update loop
    cleaning := price_row.data->'cleaning';
    if cleaning is null or coalesce((cleaning #>> '{general,rate}')::numeric, 0) <= 0 then
      raise exception 'Invalid general cleaning rate for %', price_row.id;
    end if;

    if price_row.id = 'default' or (
      price_row.id not in ('balashikha', 'salekhard', 'novy-urengoy')
      and (cleaning #>> '{general,rate}')::numeric = 250
    ) then
      cleaning := jsonb_set(cleaning, '{wet,rate}', '150');
      cleaning := jsonb_set(cleaning, '{general,rate}', '230');
      cleaning := jsonb_set(cleaning, '{repair,rate}', '280');
      cleaning := jsonb_set(cleaning, '{allInclusive,standardRate}', '410');
      cleaning := jsonb_set(cleaning, '{allInclusive,panoramicRate}', '500');
    end if;

    coefficient := (cleaning #>> '{general,rate}')::numeric / 230;
    cleaning := jsonb_set(cleaning, '{facadeGeneral}', jsonb_build_object(
      'standardRate', round(370 * coefficient / 10) * 10,
      'panoramicRate', round(450 * coefficient / 10) * 10,
      'minimum', 6000
    ));

    foreach service in array array['wet', 'general', 'repair', 'facadeGeneral', 'allInclusive'] loop
      cleaning := jsonb_set(cleaning, array[service, 'minimum'], '6000');
    end loop;

    update public.manager_calc_pricing
    set data = jsonb_set(data, '{cleaning}', cleaning), updated_at = now()
    where id = price_row.id;
  end loop;
end;
$$;
