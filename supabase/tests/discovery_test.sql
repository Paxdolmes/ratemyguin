-- Phase 2: features, stations and the new-opening radar.
\set ON_ERROR_STOP on

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2');
insert into public.profiles (id, handle, display_name, created_at) values
  ('00000000-0000-0000-0000-0000000000f1', 'disc_one', 'One', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000f2', 'disc_two', 'Two', now() - interval '1 year');
insert into public.pubs (id, name, address, city, country, location, osm_features, opened_on) values
  ('00000000-0000-0000-0000-000000000f01', 'The Garden Gate', '1 Disc St', 'Bath', 'United Kingdom', 'SRID=4326;POINT(-2.3600 51.3800)', '{beer_garden}', '2026-06-01');
insert into public.stations (name, kind, location) values
  ('Bath Spa', 'rail', 'SRID=4326;POINT(-2.3570 51.3775)'),
  ('Far Away', 'rail', 'SRID=4326;POINT(-2.5000 51.4500)');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, features)
values ('00000000-0000-0000-0000-000000000f01', auth.uid(), 8, 8, 8, 8, 8, 8, '{guinness_zero,quiet}');
set role anon;
do $$ begin
  assert (select features from public.pub_directory where id = '00000000-0000-0000-0000-000000000f01') = '{beer_garden}',
    'one drinker is not enough to add a feature';
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, features)
values ('00000000-0000-0000-0000-000000000f01', auth.uid(), 8, 8, 8, 8, 8, 8, '{guinness_zero}');
set role anon;
do $$ declare d record; s record; begin
  select * into d from public.pub_directory where id = '00000000-0000-0000-0000-000000000f01';
  assert d.features = '{beer_garden,guinness_zero}', 'two drinkers confirm a feature: ' || d.features::text;
  assert d.opened_on = '2026-06-01' and d.added_at is not null, 'opening dates come through';
  select * into s from public.nearest_stations(51.3800, -2.3600) limit 1;
  assert s.name = 'Bath Spa' and s.metres between 200 and 500 and s.walk_minutes between 3 and 8, 'nearest station with walk time';
end $$;
do $$ begin
  insert into public.stations (name, kind, location) values ('Hack', 'rail', 'SRID=4326;POINT(0 0)');
  raise exception 'anon should not add stations';
exception when insufficient_privilege then null;
end $$;
reset role;
