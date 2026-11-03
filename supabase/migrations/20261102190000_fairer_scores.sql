-- Phase 1: fairer, more trustworthy scores.
--  * Pour and fault tags, and the date of the visit, on each rating.
--  * Recent ratings count more (a six-month half-life inside the 12-month window).
--  * Reviewer-bias adjustment: consistently harsh or generous raters are nudged back
--    towards everyone else, so the score reflects the pint, not the person.
--  * Separate Pint score and Pub score, so a great room can't hide a poor pint.
--  * When the price was last reported, and a flag when a pub gets a suspicious burst.
--  * Anyone signed in can report a rating; reports are only visible to moderators.
--  * Pint photos in a public storage bucket, each person writing only to their own folder.

alter table public.ratings
  add column tags text[] not null default '{}'
    check (tags <@ array['two_part_pour', 'settled', 'good_head', 'creamy', 'cold', 'fresh', 'clean_glass',
                          'rushed_pour', 'flat', 'thin_head', 'too_warm', 'too_cold', 'metallic', 'sour', 'dirty_glass']::text[]),
  add column visited_on date check (visited_on <= current_date + 1 and visited_on > current_date - 30);

create table public.rating_reports (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.ratings (id) on delete cascade,
  reporter uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('fake', 'not_there', 'offensive', 'staff', 'other')),
  detail text check (char_length(detail) <= 300),
  created_at timestamptz not null default now(),
  unique (rating_id, reporter)
);
alter table public.rating_reports enable row level security;
create policy "report a rating as yourself" on public.rating_reports
  for insert to authenticated with check (reporter = auth.uid());

-- How far each rater sits from the crowd at the same pubs, shrunk hard until they have
-- plenty of ratings. A +1.2 rater scores everything 1.2 points above everyone else.
create view public.rater_bias with (security_invoker = false) as
with r as (
  select id, pub_id, user_id, overall from public.ratings
  where not removed and weight > 0 and rated_at > now() - interval '365 days'
), pub_mean as (
  select pub_id, sum(overall) as total, count(*) as n from r group by pub_id
), diffs as (
  -- Compare each rating with the other ratings at that pub (leave this one out).
  select r.user_id, r.overall - (pm.total - r.overall) / (pm.n - 1) as d
  from r join pub_mean pm using (pub_id) where pm.n >= 2
)
select user_id, count(*) as n,
  round((avg(d) * count(*) / (count(*) + 8))::numeric, 2) as bias
from diffs group by user_id;
revoke all on public.rater_bias from anon, authenticated;

create or replace view public.pub_scores with (security_invoker = false) as
with r as (
  select x.pub_id, x.verification, x.atmosphere, x.price_pence, x.rated_at,
    -- Recency: a rating from six months ago counts half as much as one from today.
    x.weight * power(0.5, extract(epoch from now() - x.rated_at) / 86400.0 / 182.0) as weight,
    greatest(0, least(10, x.overall - coalesce(b.bias, 0))) as overall,
    greatest(0, least(10, x.pour - coalesce(b.bias, 0))) as pour,
    greatest(0, least(10, x.head - coalesce(b.bias, 0))) as head,
    greatest(0, least(10, x.texture - coalesce(b.bias, 0))) as texture,
    greatest(0, least(10, x.taste - coalesce(b.bias, 0))) as taste,
    greatest(0, least(10, x.temperature - coalesce(b.bias, 0))) as temperature
  from public.ratings x left join public.rater_bias b on b.user_id = x.user_id
  where not x.removed and x.weight > 0 and x.rated_at > now() - interval '365 days'
), agg as (
  select pub_id,
    count(*) as n,
    sum(weight) as w,
    avg((verification <> 'none')::int) as verified_share,
    sum(weight * (pour * 2 + head + texture) / 4) / sum(weight) as pour_c,
    sum(weight * (taste + temperature) / 2) / sum(weight) as taste_c,
    sum(weight * overall) / sum(weight) as mean_overall,
    sum(weight * atmosphere) filter (where atmosphere is not null)
      / nullif(sum(weight) filter (where atmosphere is not null), 0) as atmos_c,
    count(*) filter (where atmosphere is not null) as atmos_n,
    percentile_cont(0.5) within group (order by price_pence)::numeric as median_price,
    max(rated_at) filter (where price_pence is not null) as price_at,
    count(*) filter (where rated_at > now() - interval '1 day') as last_day
  from r group by pub_id
), spread as (
  select r.pub_id, sqrt(sum(r.weight * (r.overall - a.mean_overall) ^ 2) / sum(r.weight))::numeric as sd
  from r join agg a using (pub_id) group by r.pub_id
), city_price as (
  select p.city, percentile_cont(0.5) within group (order by r.price_pence)::numeric as median_price
  from r join public.pubs p on p.id = r.pub_id group by p.city
), comp as (
  select a.*, p.city,
    case when a.n >= 2 then greatest(0, least(10, 10 - s.sd / 3 * 10)) end as consistency_c,
    case when a.median_price is null then null
         when a.median_price <= cp.median_price then greatest(0, least(10, 7 + (1 - a.median_price / cp.median_price) / 0.25 * 3))
         else greatest(0, least(10, 7 - (a.median_price / cp.median_price - 1) / 0.5 * 7)) end as value_c,
    (a.pour_c * 2 + a.taste_c) / 3 as fallback
  from agg a join spread s using (pub_id) join public.pubs p on p.id = a.pub_id
  left join city_price cp on cp.city = p.city
), scored as (
  select *, (0.40 * pour_c + 0.20 * taste_c + 0.15 * coalesce(consistency_c, fallback)
           + 0.15 * coalesce(atmos_c, fallback) + 0.10 * coalesce(value_c, fallback)) * 10 as raw,
    -- The glass alone: pour, taste and temperature, consistency.
    (0.40 * pour_c + 0.20 * taste_c + 0.15 * coalesce(consistency_c, fallback)) / 0.75 * 10 as pint_raw
  from comp
)
select p.id as pub_id, p.name, p.neighbourhood, p.city, p.country,
  coalesce(s.n, 0) as rating_count,
  round(s.verified_share, 2) as verified_share,
  round(s.mean_overall, 1) as average_overall,
  round(s.pour_c, 1) as pour, round(s.taste_c, 1) as taste_temperature,
  round(s.consistency_c, 1) as consistency, round(s.atmos_c, 1) as atmosphere_service,
  round(s.value_c, 1) as value, s.median_price::int as median_price_pence,
  case when s.n >= 3 then round((s.raw * s.w + 70 * 5) / (s.w + 5))::int end as excellence_index,
  case when s.n >= 10 then
    case when round((s.raw * s.w + 70 * 5) / (s.w + 5)) >= 95 then 'exceptional'
         when round((s.raw * s.w + 70 * 5) / (s.w + 5)) >= 90 then 'gold'
         when round((s.raw * s.w + 70 * 5) / (s.w + 5)) >= 80 then 'recommended' end
  end as award,
  case when s.n >= 3 then round((s.pint_raw * s.w + 70 * 5) / (s.w + 5))::int end as pint_score,
  case when s.atmos_n >= 3 then round(s.atmos_c * 10)::int end as pub_score,
  s.price_at as price_updated_at,
  coalesce(s.last_day >= 5 and s.last_day::numeric / s.n >= 0.5, false) as under_review
from public.pubs p left join scored s on s.pub_id = p.id;

create or replace view public.pub_directory with (security_invoker = false) as
select p.id, p.name, p.address, p.neighbourhood, p.city, p.country, p.atmosphere, p.opening_hours,
  extensions.st_y(p.location::extensions.geometry) as lat,
  extensions.st_x(p.location::extensions.geometry) as lng,
  s.rating_count, s.verified_share, s.average_overall, s.pour, s.taste_temperature, s.consistency,
  s.atmosphere_service, s.value, s.median_price_pence, s.excellence_index, s.award,
  p.website, p.brand, p.logo_url, p.image_url,
  s.pint_score, s.pub_score, s.price_updated_at, s.under_review
from public.pubs p join public.pub_scores s on s.pub_id = p.id;

create or replace view public.public_ratings with (security_invoker = false) as
select r.id, r.pub_id, case when r.anonymous then null else r.user_id end as user_id,
  r.overall, r.taste, r.temperature, r.head, r.texture, r.pour, r.atmosphere, r.price_pence,
  r.note, r.photo_path, r.verification, r.rated_at,
  case when r.anonymous then null else pr.display_name end as display_name,
  case when r.anonymous then null else pr.handle end as handle,
  r.anonymous,
  resp.body as reply,
  r.tags, r.visited_on
from public.ratings r
left join public.profiles pr on pr.id = r.user_id
left join public.pub_responses resp on resp.rating_id = r.id
where not r.removed and (r.anonymous or pr.is_public or r.user_id = auth.uid()
  or exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = r.user_id));

grant select on public.pub_directory, public.public_ratings to anon, authenticated;

-- Pint photos. Public to view; you can only upload into a folder named after your own id.
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('pint-photos', 'pint-photos', true, 6291456, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
    on conflict (id) do nothing;
    execute $p$create policy "pint photos are public" on storage.objects for select
      using (bucket_id = 'pint-photos')$p$;
    execute $p$create policy "upload your own pint photos" on storage.objects for insert to authenticated
      with check (bucket_id = 'pint-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "delete your own pint photos" on storage.objects for delete to authenticated
      using (bucket_id = 'pint-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;
