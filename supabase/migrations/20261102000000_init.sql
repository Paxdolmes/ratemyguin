-- RateMyGuin: pubs, pint ratings, verified visits, credibility weights and the
-- Excellence Index. The weights and formula mirror mobile/src/domain/scores.ts
-- and trust.ts; keep them in step.

create extension if not exists postgis with schema extensions;

-- ── People ───────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  home_city text,
  is_public boolean not null default true,
  removed_count int not null default 0, -- ratings moderators removed as fake
  created_at timestamptz not null default now()
);

create table public.follows (
  follower uuid not null references public.profiles (id) on delete cascade,
  followee uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);

-- ── Pubs ─────────────────────────────────────────────────────────────────
create table public.pubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  neighbourhood text,
  city text not null,
  country text not null,
  location extensions.geography(point, 4326) not null,
  osm_id text unique, -- seeded from OpenStreetMap where possible
  opening_hours text,
  listed_price_pence int check (listed_price_pence between 100 and 3000),
  created_at timestamptz not null default now()
);
create index pubs_location_idx on public.pubs using gist (location);
create index pubs_city_idx on public.pubs (country, city, neighbourhood);

-- Owners and staff, once a claim is approved. Staff ratings of their own pub never count.
create table public.pub_staff (
  pub_id uuid not null references public.pubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  primary key (pub_id, user_id)
);

create table public.pub_claims (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references public.pubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  evidence text not null, -- e.g. licence number, a phone call-back
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ── Ratings ──────────────────────────────────────────────────────────────
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references public.pubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  overall numeric(3,1) not null check (overall between 0 and 10 and overall * 2 = round(overall * 2)),
  taste numeric(3,1) not null check (taste between 0 and 10 and taste * 2 = round(taste * 2)),
  temperature numeric(3,1) not null check (temperature between 0 and 10 and temperature * 2 = round(temperature * 2)),
  head numeric(3,1) not null check (head between 0 and 10 and head * 2 = round(head * 2)),
  texture numeric(3,1) not null check (texture between 0 and 10 and texture * 2 = round(texture * 2)),
  pour numeric(3,1) not null check (pour between 0 and 10 and pour * 2 = round(pour * 2)),
  atmosphere numeric(3,1) check (atmosphere between 0 and 10),
  price_pence int check (price_pence between 100 and 3000),
  note text check (char_length(note) <= 500),
  photo_path text,
  anonymous boolean not null default false,
  -- Where the phone was. Set by the app, checked here.
  fix extensions.geography(point, 4326),
  fix_accuracy_m numeric,
  receipt_path text,
  receipt_checked boolean not null default false, -- set by a moderator or OCR job
  verification text not null default 'none' check (verification in ('none', 'gps', 'gps_receipt')),
  weight numeric(4,2) not null default 0,
  removed boolean not null default false,
  rated_at timestamptz not null default now()
);
create index ratings_pub_idx on public.ratings (pub_id, rated_at desc);
create index ratings_user_idx on public.ratings (user_id, rated_at desc);

-- Same rules as trust.ts: 75 m radius, 60 m accuracy.
create function public.visit_verified(p_pub uuid, p_fix extensions.geography, p_accuracy numeric)
returns boolean language sql stable set search_path = public, extensions as $$
  select p_fix is not null and p_accuracy is not null and p_accuracy <= 60
     and st_distance((select location from pubs where id = p_pub), p_fix) - p_accuracy / 2 <= 75
$$;

-- Same as reviewerWeight in trust.ts.
create function public.reviewer_weight(p_user uuid, p_pub uuid, p_verification text)
returns numeric language plpgsql stable set search_path = public as $$
declare
  w numeric;
  n int;
  age_days numeric;
  vshare numeric;
  removed_n int;
begin
  if exists (select 1 from pub_staff where pub_id = p_pub and user_id = p_user) then return 0; end if;
  select removed_count, extract(epoch from now() - created_at) / 86400 into removed_n, age_days from profiles where id = p_user;
  if removed_n >= 3 then return 0; end if;
  select count(*), coalesce(avg((verification <> 'none')::int), 0) into n, vshare
    from ratings r where r.user_id = p_user and not r.removed;
  w := case p_verification when 'gps_receipt' then 1.25 when 'gps' then 1 else 0.4 end;
  w := w * (1 + 0.4 * least(n, 50) / 50.0);
  if age_days < 30 then w := w * (0.6 + 0.4 * age_days / 30); end if;
  w := w * (0.85 + 0.3 * vshare);
  w := w * power(0.5, removed_n);
  return round(least(greatest(w, 0), 2), 2);
end $$;

-- Anti-fraud and verification, applied to every new rating whatever the app sent.
create function public.ratings_before_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  last_rating record;
  kmh numeric;
begin
  new.rated_at := now();
  new.receipt_checked := false;
  new.removed := false;
  if exists (select 1 from ratings where user_id = new.user_id and pub_id = new.pub_id
             and rated_at > now() - interval '3 hours' and not removed) then
    raise exception 'You rated this pub in the last 3 hours. One rating a visit.' using errcode = 'P0001';
  end if;
  if (select count(*) from ratings where user_id = new.user_id and rated_at > now() - interval '1 day') >= 12 then
    raise exception 'That''s a lot of pints for one day. Try again tomorrow.' using errcode = 'P0001';
  end if;
  select fix, rated_at into last_rating from ratings
    where user_id = new.user_id and fix is not null and not removed order by rated_at desc limit 1;
  if new.fix is not null and last_rating.fix is not null then
    kmh := st_distance(last_rating.fix, new.fix) / 1000.0
           / greatest(extract(epoch from now() - last_rating.rated_at) / 3600.0, 1 / 60.0);
    if kmh > 120 then
      raise exception 'That location jump looks impossible. Try again from the pub.' using errcode = 'P0001';
    end if;
  end if;
  new.verification := case when visit_verified(new.pub_id, new.fix, new.fix_accuracy_m) then 'gps' else 'none' end;
  new.weight := reviewer_weight(new.user_id, new.pub_id, new.verification);
  return new;
end $$;
create trigger ratings_before_insert before insert on public.ratings
  for each row execute function public.ratings_before_insert();

-- A moderator approving a receipt upgrades the rating.
create function public.approve_receipt(p_rating uuid) returns void
language sql security definer set search_path = public as $$
  update ratings set receipt_checked = true,
    verification = case when verification = 'gps' then 'gps_receipt' else verification end,
    weight = reviewer_weight(user_id, pub_id, case when verification = 'gps' then 'gps_receipt' else verification end)
  where id = p_rating and receipt_path is not null
$$;
revoke execute on function public.approve_receipt(uuid) from anon, authenticated;

-- ── The Excellence Index ─────────────────────────────────────────────────
-- 40% pour, 20% taste and temperature, 15% consistency, 15% atmosphere and service,
-- 10% value. Last 365 days, weighted by credibility, shrunk towards 70 with the
-- strength of 5 ratings. Needs 3 ratings for a score and 10 for an award.
create view public.pub_scores with (security_invoker = false) as
with r as (
  select * from public.ratings where not removed and weight > 0 and rated_at > now() - interval '365 days'
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
    percentile_cont(0.5) within group (order by price_pence)::numeric as median_price
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
           + 0.15 * coalesce(atmos_c, fallback) + 0.10 * coalesce(value_c, fallback)) * 10 as raw
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
  end as award
from public.pubs p left join scored s on s.pub_id = p.id;

-- Best pubs near me.
create function public.pubs_near(p_lat double precision, p_lng double precision, p_radius_m int default 2000)
returns table (pub_id uuid, name text, distance_m int, excellence_index int, award text, median_price_pence int, rating_count bigint)
language sql stable set search_path = public, extensions as $$
  select s.pub_id, s.name, st_distance(p.location, st_point(p_lng, p_lat)::geography)::int, s.excellence_index, s.award, s.median_price_pence, s.rating_count
  from pub_scores s join pubs p on p.id = s.pub_id
  where st_dwithin(p.location, st_point(p_lng, p_lat)::geography, p_radius_m)
  order by s.excellence_index desc nulls last, 3
  limit 50
$$;

-- ── Social ───────────────────────────────────────────────────────────────
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.ratings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Which pub a rating is for, without exposing the rating's private fields.
create function public.rating_pub(p_rating uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select pub_id from ratings where id = p_rating and not removed
$$;

-- A pub's public reply to a rating (one per rating).
create table public.pub_responses (
  rating_id uuid primary key references public.ratings (id) on delete cascade,
  pub_id uuid not null references public.pubs (id) on delete cascade,
  author uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Ratings as everyone else sees them: no location fix, no receipt, no name when anonymous.
create view public.public_ratings with (security_invoker = false) as
select r.id, r.pub_id, case when r.anonymous then null else r.user_id end as user_id,
  r.overall, r.taste, r.temperature, r.head, r.texture, r.pour, r.atmosphere, r.price_pence,
  r.note, r.photo_path, r.verification, r.rated_at
from public.ratings r
left join public.profiles pr on pr.id = r.user_id
where not r.removed and (r.anonymous or pr.is_public or r.user_id = auth.uid()
  or exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = r.user_id));

-- ── Row level security ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.pubs enable row level security;
alter table public.pub_staff enable row level security;
alter table public.pub_claims enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.pub_responses enable row level security;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "edit own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "create own profile" on public.profiles for insert with check (id = auth.uid());
-- removed_count is moderator-only
revoke update (removed_count) on public.profiles from anon, authenticated;

create policy "follows are readable" on public.follows for select using (true);
create policy "follow as yourself" on public.follows for insert with check (follower = auth.uid());
create policy "unfollow as yourself" on public.follows for delete using (follower = auth.uid());

create policy "pubs are readable" on public.pubs for select using (true);
create policy "owners edit their pub" on public.pubs for update using (
  exists (select 1 from public.pub_staff s where s.pub_id = id and s.user_id = auth.uid() and s.role in ('owner', 'manager')));

create policy "staff see their pubs" on public.pub_staff for select using (user_id = auth.uid());

create policy "claim as yourself" on public.pub_claims for insert with check (user_id = auth.uid() and status = 'pending');
create policy "see own claims" on public.pub_claims for select using (user_id = auth.uid());

-- Raw ratings (with location fixes) are private to their author; everyone reads public_ratings.
create policy "see own ratings" on public.ratings for select using (user_id = auth.uid());
create policy "rate as yourself" on public.ratings for insert with check (user_id = auth.uid());
create policy "delete own rating" on public.ratings for delete using (user_id = auth.uid());
revoke update on public.ratings from anon, authenticated;

create policy "comments are readable" on public.comments for select using (true);
create policy "comment as yourself" on public.comments for insert with check (user_id = auth.uid());
create policy "delete own comment" on public.comments for delete using (user_id = auth.uid());

create policy "responses are readable" on public.pub_responses for select using (true);
create policy "pubs respond to their own ratings" on public.pub_responses for insert with check (
  author = auth.uid()
  and exists (select 1 from public.pub_staff s where s.pub_id = pub_responses.pub_id and s.user_id = auth.uid())
  and public.rating_pub(rating_id) = pub_responses.pub_id);
