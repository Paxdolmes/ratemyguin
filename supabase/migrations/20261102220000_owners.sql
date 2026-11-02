-- Phase 4: the pub owner area.
--  * Verified venue updates: opening hours, features, a short note. These never touch scores.
--  * Cellar-care transparency: when the lines were last cleaned, and accreditations.
--  * Anonymised insights for staff: monthly scores and the most common pour/fault tags.
--  * Public right of reply already exists (pub_responses); owners can now edit or remove a reply.
--  * Claims: owners ask to manage a pub; a moderator approves with approve_claim().

alter table public.pubs
  add column owner_features text[] not null default '{}'
    check (owner_features <@ array['beer_garden', 'food', 'sport', 'quiet', 'step_free', 'guinness_zero']::text[]),
  add column venue_note text check (char_length(venue_note) <= 280),
  add column lines_cleaned_on date check (lines_cleaned_on <= current_date + 1),
  add column accreditations text[] not null default '{}'
    check (accreditations <@ array['cask_marque', 'guinness_quality', 'beer_and_cider_marque']::text[]),
  add column venue_updated_at timestamptz;

-- Owners and managers may only change the venue details, never the name, location or scores.
revoke update on public.pubs from anon, authenticated;
grant update (opening_hours, website, logo_url, owner_features, venue_note, lines_cleaned_on, accreditations, venue_updated_at)
  on public.pubs to authenticated;

create policy "owners edit their reply" on public.pub_responses for update using (
  author = auth.uid() and exists (select 1 from public.pub_staff s where s.pub_id = pub_responses.pub_id and s.user_id = auth.uid()));
create policy "owners remove their reply" on public.pub_responses for delete using (
  author = auth.uid() and exists (select 1 from public.pub_staff s where s.pub_id = pub_responses.pub_id and s.user_id = auth.uid()));

-- Features shown to drinkers: OpenStreetMap, the owner, or two drinkers in the last year.
create or replace view public.pub_features with (security_invoker = false) as
select p.id as pub_id,
  array(
    select distinct f from (
      select unnest(p.osm_features) as f
      union all
      select unnest(p.owner_features)
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
  f.features, p.opened_on, p.created_at as added_at,
  p.venue_note, p.lines_cleaned_on, p.accreditations, p.venue_updated_at,
  exists (select 1 from public.pub_staff st where st.pub_id = p.id and st.role in ('owner', 'manager')) as claimed
from public.pubs p join public.pub_scores s on s.pub_id = p.id
join public.pub_features f on f.pub_id = p.id;
grant select on public.pub_directory to anon, authenticated;

-- Insights for a pub's own staff: never individual raters, only counts and averages.
create function public.pub_insights(p_pub uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  if not exists (select 1 from pub_staff where pub_id = p_pub and user_id = auth.uid()) then
    raise exception 'Only this pub''s staff can see its insights' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'months', coalesce((
      select jsonb_agg(m order by m->>'month') from (
        select jsonb_build_object('month', to_char(date_trunc('month', rated_at), 'YYYY-MM'),
          'pints', count(*), 'overall', round(avg(overall), 1), 'pour', round(avg((pour * 2 + head + texture) / 4), 1),
          'verified', round(avg((verification <> 'none')::int), 2)) as m
        from ratings where pub_id = p_pub and not removed and rated_at > now() - interval '12 months'
        group by date_trunc('month', rated_at)) months), '[]'::jsonb),
    'tags_recent', coalesce((
      select jsonb_object_agg(t, n) from (
        select unnest(tags) as t, count(*) as n from ratings
        where pub_id = p_pub and not removed and rated_at > now() - interval '90 days' group by 1) x), '{}'::jsonb),
    'tags_before', coalesce((
      select jsonb_object_agg(t, n) from (
        select unnest(tags) as t, count(*) as n from ratings
        where pub_id = p_pub and not removed and rated_at between now() - interval '180 days' and now() - interval '90 days' group by 1) x), '{}'::jsonb),
    'unanswered', (select count(*) from ratings r where r.pub_id = p_pub and not r.removed
                   and not exists (select 1 from pub_responses pr where pr.rating_id = r.id))
  ) into out;
  return out;
end $$;
grant execute on function public.pub_insights(uuid) to authenticated;

-- Moderators approve a claim (run from the dashboard or SQL editor, not from the apps).
create function public.approve_claim(p_claim uuid, p_role text default 'owner') returns void
language sql security definer set search_path = public as $$
  update pub_claims set status = 'approved' where id = p_claim;
  insert into pub_staff (pub_id, user_id, role)
    select pub_id, user_id, p_role from pub_claims where id = p_claim
  on conflict (pub_id, user_id) do update set role = excluded.role;
$$;
revoke execute on function public.approve_claim(uuid, text) from anon, authenticated;
