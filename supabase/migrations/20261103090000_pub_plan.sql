-- ratemyGuin for Pubs: the paid plan, plus offers and "Our featured pubs".
--  * Money never touches scores or the league table.
--  * Drinkers never see which plan a pub is on: pub_plans is readable only by that pub's
--    owners and managers, and the plan check lives in a schema the API does not expose.
--  * Paid tools: quality alerts, local comparison, best times, events, photos, offers.
--  * Featured pubs are always shown with a "Sponsored" label, apart from the rankings.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create table public.pub_plans (
  pub_id uuid primary key references public.pubs (id) on delete cascade,
  status text not null check (status in ('active', 'trialing', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  stripe_customer text,
  stripe_subscription text unique,
  alerts boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.pub_plans enable row level security;
create policy "managers see their plan" on public.pub_plans for select using (
  exists (select 1 from public.pub_staff s where s.pub_id = pub_plans.pub_id and s.user_id = auth.uid()
          and s.role in ('owner', 'manager')));
-- No insert or update policies: only payments (server side) or a moderator change a plan.

create function private.has_plan(p_pub uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pub_plans where pub_id = p_pub and status in ('active', 'trialing', 'past_due')
                 and (current_period_end is null or current_period_end > now() - interval '3 days'))
$$;
create function private.is_staff(p_pub uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pub_staff where pub_id = p_pub and user_id = auth.uid())
$$;
revoke execute on all functions in schema private from public;
grant execute on function private.has_plan(uuid), private.is_staff(uuid) to authenticated;

create function private.require_plan(p_pub uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_staff(p_pub) then
    raise exception 'Only this pub''s staff can see this' using errcode = '42501';
  end if;
  if not private.has_plan(p_pub) then
    raise exception 'This is part of ratemyGuin for Pubs' using errcode = 'P0402';
  end if;
end $$;
grant execute on function private.require_plan(uuid) to authenticated;

-- Owners turn quality alert emails on or off.
create function public.set_quality_alerts(p_pub uuid, p_on boolean) returns void
language sql security definer set search_path = public as $$
  update pub_plans set alerts = p_on, updated_at = now() where pub_id = p_pub
    and exists (select 1 from pub_staff s where s.pub_id = p_pub and s.user_id = auth.uid() and s.role in ('owner', 'manager'))
$$;
grant execute on function public.set_quality_alerts(uuid, boolean) to authenticated;

-- ── Events ("What's on") ───────────────────────────────────────────────────
create table public.pub_events (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references public.pubs (id) on delete cascade,
  kind text not null check (kind in ('quiz', 'live_sport', 'live_music', 'food', 'tasting', 'other')),
  title text not null check (char_length(title) between 2 and 80),
  starts_at timestamptz not null,
  note text check (char_length(note) <= 280),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index pub_events_pub_idx on public.pub_events (pub_id, starts_at);
alter table public.pub_events enable row level security;
create policy "events are public" on public.pub_events for select using (true);
create policy "planned pubs add events" on public.pub_events for insert to authenticated
  with check (private.is_staff(pub_id) and private.has_plan(pub_id));
create policy "staff remove events" on public.pub_events for delete to authenticated using (private.is_staff(pub_id));

-- ── Photos ─────────────────────────────────────────────────────────────────
create table public.pub_photos (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references public.pubs (id) on delete cascade,
  path text not null,
  caption text check (char_length(caption) <= 120),
  created_at timestamptz not null default now()
);
create index pub_photos_pub_idx on public.pub_photos (pub_id, created_at desc);
alter table public.pub_photos enable row level security;
create policy "pub photos are public" on public.pub_photos for select using (true);
create policy "planned pubs add photos" on public.pub_photos for insert to authenticated
  with check (private.is_staff(pub_id) and private.has_plan(pub_id) and path like pub_id::text || '/%'
              and (select count(*) from public.pub_photos p where p.pub_id = pub_photos.pub_id) < 12);
create policy "staff remove photos" on public.pub_photos for delete to authenticated using (private.is_staff(pub_id));

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('pub-photos', 'pub-photos', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
    execute $p$create policy "pub gallery photos are public" on storage.objects for select
      using (bucket_id = 'pub-photos')$p$;
    execute $p$create policy "planned pubs upload photos" on storage.objects for insert to authenticated
      with check (bucket_id = 'pub-photos' and private.is_staff(((storage.foldername(name))[1])::uuid)
                  and private.has_plan(((storage.foldername(name))[1])::uuid))$p$;
    execute $p$create policy "staff delete pub photos" on storage.objects for delete to authenticated
      using (bucket_id = 'pub-photos' and private.is_staff(((storage.foldername(name))[1])::uuid))$p$;
  end if;
end $$;

-- ── Offers near me ─────────────────────────────────────────────────────────
-- UK rules on alcohol promotions: nothing that pushes people to drink more or faster.
create function private.responsible_offer(p text) returns boolean language sql immutable as $$
  select p !~* '(bottomless|unlimited|all[- ]you[- ]can[- ]drink|free (pint|drink|round|shot)s?|buy \w+ get|\m(2|two) ?(for|4) ?(1|one)\M|bogof|down it|down in one|chug|drinking game|shots?\M|as much as|drink more|get drunk|wasted|hammered)'
$$;
grant execute on function private.responsible_offer(text) to anon, authenticated;

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references public.pubs (id) on delete cascade,
  kind text not null check (kind in ('food', 'pint', 'event', 'other')),
  title text not null check (char_length(title) between 3 and 60),
  details text check (char_length(details) <= 200),
  days smallint[] not null default '{0,1,2,3,4,5,6}' check (days <@ array[0,1,2,3,4,5,6]::smallint[] and cardinality(days) > 0),
  starts_on date not null default current_date,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on <= starts_on + 90),
  check (private.responsible_offer(title || ' ' || coalesce(details, '')))
);
create index offers_live_idx on public.offers (ends_on, starts_on);
alter table public.offers enable row level security;
create policy "offers are public" on public.offers for select using (true);
create policy "planned pubs post offers" on public.offers for insert to authenticated
  with check (private.is_staff(pub_id) and private.has_plan(pub_id)
              and (select count(*) from public.offers o where o.pub_id = offers.pub_id and o.ends_on >= current_date) < 3);
create policy "staff remove offers" on public.offers for delete to authenticated using (private.is_staff(pub_id));

-- Offers running today within p_metres of a point, nearest first.
create function public.offers_near(p_lat double precision, p_lng double precision, p_metres int default 3000)
returns table (id uuid, pub_id uuid, pub_name text, neighbourhood text, kind text, title text, details text,
               days smallint[], ends_on date, metres int, lat double precision, lng double precision)
language sql stable set search_path = public, extensions as $$
  select o.id, p.id, p.name, p.neighbourhood, o.kind, o.title, o.details, o.days, o.ends_on,
    round(st_distance(p.location, st_point(p_lng, p_lat)::geography))::int,
    st_y(p.location::geometry), st_x(p.location::geometry)
  from offers o join pubs p on p.id = o.pub_id
  where current_date between o.starts_on and o.ends_on
    and extract(dow from (now() at time zone 'Europe/London'))::smallint = any (o.days)
    and st_dwithin(p.location, st_point(p_lng, p_lat)::geography, least(p_metres, 20000))
  order by p.location <-> st_point(p_lng, p_lat)::geography
  limit 40
$$;
grant execute on function public.offers_near(double precision, double precision, int) to anon, authenticated;

-- ── Our featured pubs (sponsored) ──────────────────────────────────────────
create table public.featured_pubs (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references public.pubs (id) on delete cascade,
  city text, -- null means everywhere
  starts_on date not null default current_date,
  ends_on date not null,
  stripe_session text unique,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
alter table public.featured_pubs enable row level security;
create policy "running features are public" on public.featured_pubs for select
  using (current_date between starts_on and ends_on);

create view public.featured_now with (security_invoker = false) as
select distinct on (f.pub_id) d.id, d.name, d.neighbourhood, d.city, d.lat, d.lng, d.logo_url, d.image_url, d.brand
from public.featured_pubs f join public.pub_directory d on d.id = f.pub_id
where current_date between f.starts_on and f.ends_on
order by f.pub_id, f.ends_on desc;
grant select on public.featured_now to anon, authenticated;

-- ── Paid insights ──────────────────────────────────────────────────────────
-- How a pub compares with its ten nearest neighbours, and what drinkers praise there.
create function public.pub_local_comparison(p_pub uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare out jsonb;
begin
  perform private.require_plan(p_pub);
  with me as (select location from pubs where id = p_pub),
  near as (
    select p.id, p.name, round(st_distance(p.location, me.location))::int as metres
    from pubs p, me where p.id <> p_pub
    order by p.location <-> me.location limit 10
  ),
  everyone as (
    select n.id, n.name, n.metres, s.excellence_index, s.pint_score, s.rating_count
    from near n join pub_scores s on s.pub_id = n.id
    union all
    select p_pub, (select name from pubs where id = p_pub), 0, s.excellence_index, s.pint_score, s.rating_count
    from pub_scores s where s.pub_id = p_pub
  ),
  praise as (
    select t, (r.pub_id = p_pub) as mine, count(*) as n
    from ratings r, unnest(r.tags) t
    where not r.removed and r.rated_at > now() - interval '180 days'
      and (r.pub_id = p_pub or r.pub_id in (select id from near))
      and t in ('two_part_pour', 'settled', 'good_head', 'creamy', 'cold', 'fresh', 'clean_glass')
    group by 1, 2
  ),
  counts as (
    select (r.pub_id = p_pub) as mine, count(*) as n from ratings r
    where not r.removed and r.rated_at > now() - interval '180 days'
      and (r.pub_id = p_pub or r.pub_id in (select id from near))
    group by 1
  )
  select jsonb_build_object(
    'pubs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'metres', metres,
              'excellence', excellence_index, 'pint', pint_score, 'ratings', rating_count, 'you', id = p_pub)
              order by excellence_index desc nulls last, metres) from everyone), '[]'::jsonb),
    'praise', coalesce((select jsonb_object_agg(t, jsonb_build_object('you', you, 'nearby', nearby)) from (
              select t,
                round(coalesce(sum(n) filter (where mine), 0)::numeric / greatest((select n from counts where mine), 1), 2) as you,
                round(coalesce(sum(n) filter (where not mine), 0)::numeric / greatest((select n from counts where not mine), 1), 2) as nearby
              from praise group by t) x), '{}'::jsonb)
  ) into out;
  return out;
end $$;
grant execute on function public.pub_local_comparison(uuid) to authenticated;

-- When the pint is at its best: average score by day of week and time of day (London time).
create function public.pub_best_times(p_pub uuid)
returns table (dow int, slot text, pints int, overall numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  perform private.require_plan(p_pub);
  return query
  select extract(dow from local)::int,
    case when extract(hour from local) < 15 then 'lunch' when extract(hour from local) < 18 then 'afternoon'
         when extract(hour from local) < 21 then 'evening' else 'late' end,
    count(*)::int, round(avg(r.overall), 1)
  from (select rr.*, rr.rated_at at time zone 'Europe/London' as local from ratings rr
        where rr.pub_id = p_pub and not rr.removed and rr.rated_at > now() - interval '12 months') r
  group by 1, 2;
end $$;
grant execute on function public.pub_best_times(uuid) to authenticated;

-- Quality dips: the last 14 days against the 90 days before, for each part of the pint.
create function private.quality_dips(p_pub uuid default null)
returns table (pub_id uuid, part text, recent numeric, before numeric, pints int)
language sql stable set search_path = public as $$
  with parts as (
    select r.pub_id, r.rated_at, x.part, x.score
    from ratings r, lateral (values ('pour', (r.pour * 2 + r.head + r.texture) / 4), ('temperature', r.temperature),
                                    ('taste', r.taste), ('overall', r.overall)) x(part, score)
    where not r.removed and r.rated_at > now() - interval '104 days' and (p_pub is null or r.pub_id = p_pub)
  )
  select pub_id, part,
    round(avg(score) filter (where rated_at > now() - interval '14 days'), 1),
    round(avg(score) filter (where rated_at <= now() - interval '14 days'), 1),
    (count(*) filter (where rated_at > now() - interval '14 days'))::int
  from parts group by pub_id, part
  having count(*) filter (where rated_at > now() - interval '14 days') >= 3
     and count(*) filter (where rated_at <= now() - interval '14 days') >= 3
     and avg(score) filter (where rated_at > now() - interval '14 days')
         < avg(score) filter (where rated_at <= now() - interval '14 days') - 0.7
$$;

create function public.pub_alerts(p_pub uuid)
returns table (part text, recent numeric, before numeric, pints int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform private.require_plan(p_pub);
  return query select d.part, d.recent, d.before, d.pints from private.quality_dips(p_pub) d;
end $$;
grant execute on function public.pub_alerts(uuid) to authenticated;

-- For the daily alert email job (run with the database owner's rights, never from the apps).
create table private.alerts_sent (
  pub_id uuid not null, part text not null, sent_on date not null default current_date,
  primary key (pub_id, part, sent_on)
);
create function private.alerts_to_send()
returns table (pub_id uuid, pub_name text, emails text[], part text, recent numeric, before numeric, pints int)
language sql volatile set search_path = public as $$
  with due as (
    select d.* from private.quality_dips() d join pub_plans pl on pl.pub_id = d.pub_id
    where pl.alerts and private.has_plan(d.pub_id)
      and not exists (select 1 from private.alerts_sent a where a.pub_id = d.pub_id and a.part = d.part
                      and a.sent_on > current_date - 7)
  ), marked as (
    insert into private.alerts_sent (pub_id, part) select due.pub_id, due.part from due returning 1
  )
  select due.pub_id, p.name,
    array(select u.email::text from pub_staff s join auth.users u on u.id = s.user_id
          where s.pub_id = due.pub_id and s.role in ('owner', 'manager') and u.email is not null),
    due.part, due.recent, due.before, due.pints
  from due join pubs p on p.id = due.pub_id
$$;

-- ── Moderator and payment helpers (not callable from the apps) ─────────────
-- Give a pub the plan for a number of days, e.g. a free trial: select grant_pub_plan('<pub id>', 30);
create function public.grant_pub_plan(p_pub uuid, p_days int default 30) returns void
language sql security definer set search_path = public as $$
  insert into pub_plans (pub_id, status, current_period_end) values (p_pub, 'trialing', now() + make_interval(days => p_days))
  on conflict (pub_id) do update set status = case when pub_plans.stripe_subscription is null then 'trialing' else pub_plans.status end,
    current_period_end = greatest(pub_plans.current_period_end, excluded.current_period_end), updated_at = now();
$$;
-- Feature a pub: select feature_pub('<pub id>', 7, 'London');
create function public.feature_pub(p_pub uuid, p_days int default 7, p_city text default null, p_session text default null)
returns void language sql security definer set search_path = public as $$
  insert into featured_pubs (pub_id, city, starts_on, ends_on, stripe_session)
  values (p_pub, coalesce(p_city, (select city from pubs where id = p_pub)), current_date, current_date + p_days - 1, p_session)
  on conflict (stripe_session) do nothing;
$$;
-- Called by the Stripe webhook when a subscription changes.
create function public.sync_pub_plan(p_pub uuid, p_status text, p_period_end timestamptz, p_customer text, p_subscription text)
returns void language sql security definer set search_path = public as $$
  insert into pub_plans (pub_id, status, current_period_end, stripe_customer, stripe_subscription)
  values (p_pub, p_status, p_period_end, p_customer, p_subscription)
  on conflict (pub_id) do update set status = excluded.status, current_period_end = excluded.current_period_end,
    stripe_customer = excluded.stripe_customer, stripe_subscription = excluded.stripe_subscription, updated_at = now();
$$;
revoke execute on function public.grant_pub_plan(uuid, int), public.feature_pub(uuid, int, text, text),
  public.sync_pub_plan(uuid, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.sync_pub_plan(uuid, text, timestamptz, text, text), public.feature_pub(uuid, int, text, text) to service_role;
revoke execute on function private.quality_dips(uuid), private.alerts_to_send() from public, anon, authenticated;
