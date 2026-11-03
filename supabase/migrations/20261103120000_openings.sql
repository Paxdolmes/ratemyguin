-- New openings (proof of concept): recently opened and coming-soon London pubs, gathered
-- from news and listings and linked to their source. Later this can be filled automatically.
create table public.openings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  neighbourhood text,
  city text not null default 'London',
  status text not null check (status in ('open', 'coming_soon')),
  opened_label text not null,       -- e.g. "Opened March 2026", "Opening 24 November"
  sort_on date not null,            -- for ordering, newest first
  blurb text check (char_length(blurb) <= 240),
  source_name text not null,
  source_url text not null check (source_url ~ '^https?://'),
  pub_id uuid references public.pubs (id) on delete set null,
  added_on date not null default current_date,
  unique (name, city)
);
alter table public.openings enable row level security;
create policy "openings are public" on public.openings for select using (true);
