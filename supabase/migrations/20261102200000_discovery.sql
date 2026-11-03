-- Phase 2: discovery.
--  * Pub features (beer garden, food, sport on TV, quiet corners, step-free, Guinness 0.0),
--    from OpenStreetMap and confirmed by drinkers when they rate.
--  * When a pub opened (from OpenStreetMap) and when it joined ratemyGuin, for the new-opening radar.
--  * Tube, Overground, Elizabeth line, DLR and rail stations, and the nearest ones to a pub.

alter table public.pubs
  add column osm_features text[] not null default '{}',
  add column opened_on date;

alter table public.ratings
  add column features text[] not null default '{}'
    check (features <@ array['beer_garden', 'food', 'sport', 'quiet', 'step_free', 'guinness_zero']::text[]);

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('tube', 'overground', 'elizabeth', 'dlr', 'rail', 'tram')),
  location extensions.geography(point, 4326) not null,
  osm_id text unique
);
create index stations_location_idx on public.stations using gist (location);
alter table public.stations enable row level security;
create policy "stations are public" on public.stations for select using (true);

-- The two closest stations to a point, with walking minutes (about 80 m a minute, plus 20% for streets).
create function public.nearest_stations(p_lat double precision, p_lng double precision)
returns table (name text, kind text, metres int, walk_minutes int)
language sql stable set search_path = public, extensions as $$
  select s.name, s.kind, round(st_distance(s.location, st_point(p_lng, p_lat)::geography))::int,
    greatest(1, round(st_distance(s.location, st_point(p_lng, p_lat)::geography) * 1.2 / 80))::int
  from stations s
  order by s.location <-> st_point(p_lng, p_lat)::geography
  limit 2
$$;
grant execute on function public.nearest_stations(double precision, double precision) to anon, authenticated;

-- A feature counts when OpenStreetMap lists it or two drinkers in the last year said so.
create view public.pub_features with (security_invoker = false) as
select p.id as pub_id,
  array(
    select distinct f from (
      select unnest(p.osm_features) as f
      union all
      select f from (
        select unnest(r.features) as f from public.ratings r
        where r.pub_id = p.id and not r.removed and r.rated_at > now() - interval '365 days'
      ) crowd group by f having count(*) >= 2
    ) x order by f
  ) as features
from public.pubs p;

create or replace view public.pub_directory with (security_invoker = false) as
select p.id, p.name, p.address, p.neighbourhood, p.city, p.country, p.atmosphere, p.opening_hours,
  extensions.st_y(p.location::extensions.geometry) as lat,
  extensions.st_x(p.location::extensions.geometry) as lng,
  s.rating_count, s.verified_share, s.average_overall, s.pour, s.taste_temperature, s.consistency,
  s.atmosphere_service, s.value, s.median_price_pence, s.excellence_index, s.award,
  p.website, p.brand, p.logo_url, p.image_url,
  s.pint_score, s.pub_score, s.price_updated_at, s.under_review,
  f.features, p.opened_on, p.created_at as added_at
from public.pubs p join public.pub_scores s on s.pub_id = p.id
join public.pub_features f on f.pub_id = p.id;

grant select on public.pub_directory to anon, authenticated;
