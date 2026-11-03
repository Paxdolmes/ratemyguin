-- Ready for the App Store:
--  * 18+ only: a profile can only be created once the person confirms they are 18 or over.
--    We keep the date they confirmed, not their date of birth.
--  * Delete your account from inside the app (Apple guideline 5.1.1).
--  * Block people and report photos (Apple guideline 1.2 for user content).

alter table public.profiles add column adult_confirmed_at timestamptz;
update public.profiles set adult_confirmed_at = created_at where adult_confirmed_at is null;

create function public.profiles_require_adult() returns trigger language plpgsql as $$
begin
  -- Sign-ups come through the API as "authenticated"; moderators and tests are exempt.
  if current_user in ('authenticated', 'anon') and new.adult_confirmed_at is null then
    raise exception 'ratemyGuin is for people aged 18 and over' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger profiles_require_adult before insert on public.profiles
  for each row execute function public.profiles_require_adult();

-- Delete everything about me. Ratings, lists, follows and claims go with the profile.
-- (The apps remove the person's photos from storage first.)
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  delete from public.pub_responses where author = me;
  delete from public.profiles where id = me;
  delete from auth.users where id = me;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Blocking: you stop seeing someone's ratings, even anonymous ones, without learning who they are.
create table public.blocks (
  blocker uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy "see your blocks" on public.blocks for select using (blocker = auth.uid());
create policy "unblock" on public.blocks for delete using (blocker = auth.uid());

create function public.block_rating_author(p_rating uuid) returns void
language sql security definer set search_path = public as $$
  insert into blocks (blocker, blocked)
  select auth.uid(), r.user_id from ratings r where r.id = p_rating and r.user_id <> auth.uid() and auth.uid() is not null
  on conflict do nothing;
$$;
revoke execute on function public.block_rating_author(uuid) from public, anon;
grant execute on function public.block_rating_author(uuid) to authenticated;

create function public.unblock_all() returns void language sql security definer set search_path = public as $$
  delete from blocks where blocker = auth.uid();
$$;
revoke execute on function public.unblock_all() from public, anon;
grant execute on function public.unblock_all() to authenticated;

-- Photos: report one, and it is hidden after two reports until a moderator looks.
alter table public.ratings add column photo_hidden boolean not null default false;
alter table public.rating_reports drop constraint rating_reports_reason_check;
alter table public.rating_reports add constraint rating_reports_reason_check
  check (reason in ('fake', 'not_there', 'offensive', 'staff', 'photo', 'other'));

create function public.hide_reported_photos() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.reason in ('photo', 'offensive') and (
    select count(*) from rating_reports where rating_id = new.rating_id and reason in ('photo', 'offensive')) >= 2 then
    update ratings set photo_hidden = true where id = new.rating_id;
  end if;
  return new;
end $$;
create trigger hide_reported_photos after insert on public.rating_reports
  for each row execute function public.hide_reported_photos();

create or replace view public.public_ratings with (security_invoker = false) as
select r.id, r.pub_id, case when r.anonymous then null else r.user_id end as user_id,
  r.overall, r.taste, r.temperature, r.head, r.texture, r.pour, r.atmosphere, r.price_pence,
  r.note, case when r.photo_hidden then null else r.photo_path end as photo_path, r.verification, r.rated_at,
  case when r.anonymous then null else pr.display_name end as display_name,
  case when r.anonymous then null else pr.handle end as handle,
  r.anonymous,
  resp.body as reply,
  r.tags, r.visited_on
from public.ratings r
left join public.profiles pr on pr.id = r.user_id
left join public.pub_responses resp on resp.rating_id = r.id
where not r.removed and (r.anonymous or pr.is_public or r.user_id = auth.uid()
  or exists (select 1 from public.follows f where f.follower = auth.uid() and f.followee = r.user_id))
  and not exists (select 1 from public.blocks b where b.blocker = auth.uid() and b.blocked = r.user_id);
grant select on public.public_ratings to anon, authenticated;

-- Crash reports from the apps and the site, so we hear about problems testers hit.
-- Anyone can add one; nobody can read them through the API.
create table public.app_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null check (source in ('ios', 'android', 'web')),
  app_version text check (char_length(app_version) <= 40),
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 4000),
  path text check (char_length(path) <= 200),
  user_id uuid default auth.uid()
);
alter table public.app_errors enable row level security;
create policy "report a crash" on public.app_errors for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
revoke select, update, delete on public.app_errors from anon, authenticated;
