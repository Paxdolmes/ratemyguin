-- Offers near me: show the whole week, with today's offers first.
drop function public.offers_near(double precision, double precision, int);
create function public.offers_near(p_lat double precision, p_lng double precision, p_metres int default 3000)
returns table (id uuid, pub_id uuid, pub_name text, neighbourhood text, kind text, title text, details text,
               days smallint[], ends_on date, metres int, lat double precision, lng double precision,
               source text, source_url text, found_on date, today boolean)
language sql stable set search_path = public, extensions as $$
  select o.id, p.id, p.name, p.neighbourhood, o.kind, o.title, o.details, o.days, o.ends_on,
    round(st_distance(p.location, st_point(p_lng, p_lat)::geography))::int,
    st_y(p.location::geometry), st_x(p.location::geometry), o.source, o.source_url, o.found_on,
    extract(dow from (now() at time zone 'Europe/London'))::smallint = any (o.days)
  from offers o join pubs p on p.id = o.pub_id
  where current_date between o.starts_on and o.ends_on
    and st_dwithin(p.location, st_point(p_lng, p_lat)::geography, least(p_metres, 20000))
  order by 16 desc, (o.source = 'web'), p.location <-> st_point(p_lng, p_lat)::geography
  limit 80
$$;
grant execute on function public.offers_near(double precision, double precision, int) to anon, authenticated;
