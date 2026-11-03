-- Offers found on pubs' own websites (proof of concept). Shown as "From the pub's website"
-- with a link to the source; offers the pub posts itself come first.
alter table public.offers
  add column source text not null default 'pub' check (source in ('pub', 'web')),
  add column source_url text check (source_url ~ '^https?://'),
  add column found_on date,
  add constraint web_offers_have_a_source check (source = 'pub' or source_url is not null);

drop function public.offers_near(double precision, double precision, int);
create function public.offers_near(p_lat double precision, p_lng double precision, p_metres int default 3000)
returns table (id uuid, pub_id uuid, pub_name text, neighbourhood text, kind text, title text, details text,
               days smallint[], ends_on date, metres int, lat double precision, lng double precision,
               source text, source_url text, found_on date)
language sql stable set search_path = public, extensions as $$
  select o.id, p.id, p.name, p.neighbourhood, o.kind, o.title, o.details, o.days, o.ends_on,
    round(st_distance(p.location, st_point(p_lng, p_lat)::geography))::int,
    st_y(p.location::geometry), st_x(p.location::geometry), o.source, o.source_url, o.found_on
  from offers o join pubs p on p.id = o.pub_id
  where current_date between o.starts_on and o.ends_on
    and extract(dow from (now() at time zone 'Europe/London'))::smallint = any (o.days)
    and st_dwithin(p.location, st_point(p_lng, p_lat)::geography, least(p_metres, 20000))
  order by (o.source = 'web'), p.location <-> st_point(p_lng, p_lat)::geography
  limit 60
$$;
grant execute on function public.offers_near(double precision, double precision, int) to anon, authenticated;
