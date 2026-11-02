-- What the apps read: pubs with coordinates and scores in one row, and ratings
-- with the rater's name. Plus each pub's atmosphere tag for the Discover filter.

alter table public.pubs add column atmosphere text
  check (atmosphere in ('Traditional', 'Cosy', 'Lively', 'Sports'));

-- Pubs with their Excellence Index, as Discover and pub profiles need them.
create view public.pub_directory with (security_invoker = false) as
select p.id, p.name, p.address, p.neighbourhood, p.city, p.country, p.atmosphere, p.opening_hours,
  extensions.st_y(p.location::extensions.geometry) as lat,
  extensions.st_x(p.location::extensions.geometry) as lng,
  s.rating_count, s.verified_share, s.average_overall, s.pour, s.taste_temperature, s.consistency,
  s.atmosphere_service, s.value, s.median_price_pence, s.excellence_index, s.award
from public.pubs p join public.pub_scores s on s.pub_id = p.id;

-- Ratings as everyone sees them, now with the rater's name and any reply from the pub.
create or replace view public.public_ratings with (security_invoker = false) as
select r.id, r.pub_id, case when r.anonymous then null else r.user_id end as user_id,
  r.overall, r.taste, r.temperature, r.head, r.texture, r.pour, r.atmosphere, r.price_pence,
  r.note, r.photo_path, r.verification, r.rated_at,
  case when r.anonymous then null else pr.display_name end as display_name,
  case when r.anonymous then null else pr.handle end as handle,
  r.anonymous,
  resp.body as reply
from public.ratings r
left join public.profiles pr on pr.id = r.user_id
left join public.pub_responses resp on resp.rating_id = r.id
where not r.removed and (r.anonymous or pr.is_public or r.user_id = auth.uid()
  or exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = r.user_id));

grant select on public.pub_directory, public.public_ratings to anon, authenticated;

-- Discover: pubs within a radius, best first, with everything a list row and map pin need.
create function public.pub_directory_near(p_lat double precision, p_lng double precision, p_radius_m int default 3000)
returns setof public.pub_directory
language sql stable set search_path = public, extensions as $$
  select d.* from pub_directory d join pubs p on p.id = d.id
  where st_dwithin(p.location, st_point(p_lng, p_lat)::geography, p_radius_m)
  order by d.excellence_index desc nulls last, st_distance(p.location, st_point(p_lng, p_lat)::geography)
  limit 200
$$;

-- The pubs the signed-in person owns or works at, for RateMyGuin for Pubs.
create function public.my_pubs() returns setof uuid
language sql stable security definer set search_path = public as $$
  select pub_id from pub_staff where user_id = auth.uid()
$$;
