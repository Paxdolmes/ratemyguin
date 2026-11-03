-- Phase 3: personal features inside the Passport.
--  * Saved lists ("Best after-work pint", "Pubs to try with Dad"), private unless shared.
--  * Following friends and comparing favourites, respecting each person's privacy setting.

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index lists_owner_idx on public.lists (owner, created_at desc);

create table public.list_pubs (
  list_id uuid not null references public.lists (id) on delete cascade,
  pub_id uuid not null references public.pubs (id) on delete cascade,
  note text check (char_length(note) <= 140),
  added_at timestamptz not null default now(),
  primary key (list_id, pub_id)
);

alter table public.lists enable row level security;
alter table public.list_pubs enable row level security;
create policy "see own or public lists" on public.lists for select using (owner = auth.uid() or is_public);
create policy "make own lists" on public.lists for insert with check (owner = auth.uid());
create policy "edit own lists" on public.lists for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "delete own lists" on public.lists for delete using (owner = auth.uid());
create policy "see pubs on visible lists" on public.list_pubs for select using (
  exists (select 1 from public.lists l where l.id = list_id and (l.owner = auth.uid() or l.is_public)));
create policy "add to own lists" on public.list_pubs for insert with check (
  exists (select 1 from public.lists l where l.id = list_id and l.owner = auth.uid()));
create policy "remove from own lists" on public.list_pubs for delete using (
  exists (select 1 from public.lists l where l.id = list_id and l.owner = auth.uid()));

-- Someone's favourite pubs (their best average pint, at least one rating), for comparing
-- with your own. Only for public profiles, people you follow, or yourself.
create function public.favourites(p_user uuid)
returns table (pub_id uuid, name text, city text, pints int, average numeric)
language sql stable security definer set search_path = public as $$
  select r.pub_id, p.name, p.city, count(*)::int, round(avg(r.overall), 1)
  from ratings r join pubs p on p.id = r.pub_id join profiles pr on pr.id = r.user_id
  where r.user_id = p_user and not r.removed and not r.anonymous
    and (pr.is_public or p_user = auth.uid()
         or exists (select 1 from follows f where f.follower = auth.uid() and f.followee = p_user))
  group by r.pub_id, p.name, p.city
  order by avg(r.overall) desc, count(*) desc
  limit 10
$$;
grant execute on function public.favourites(uuid) to anon, authenticated;

-- Privacy controls for the pint diary: hide or show your name on one of your ratings.
create function public.set_rating_anonymous(p_rating uuid, p_anonymous boolean) returns void
language sql security definer set search_path = public as $$
  update ratings set anonymous = p_anonymous where id = p_rating and user_id = auth.uid()
$$;
grant execute on function public.set_rating_anonymous(uuid, boolean) to authenticated;
