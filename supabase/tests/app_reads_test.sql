-- The views the apps read: coordinates, scores, names and anonymity.
\set ON_ERROR_STOP on

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2');
insert into public.profiles (id, handle, display_name, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'dee', 'Dee Okafor', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000c2', 'eve', 'Eve Hart', now() - interval '1 year');
insert into public.pubs (id, name, address, city, country, location, atmosphere) values
  ('00000000-0000-0000-0000-000000000c01', 'The Test Tap', '2 Test St', 'Leeds', 'United Kingdom', 'SRID=4326;POINT(-1.5491 53.8008)', 'Cosy');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, fix, fix_accuracy_m)
values ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000c1', 9, 9, 9, 9, 9, 9, 'SRID=4326;POINT(-1.5491 53.8008)', 10);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, anonymous)
values ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000c2', 7, 7, 7, 7, 7, 7, true);

set role anon;
reset request.jwt.claim.sub;
do $$ declare d record; begin
  select * into d from public.pub_directory where id = '00000000-0000-0000-0000-000000000c01';
  assert abs(d.lat - 53.8008) < 0.0001 and abs(d.lng + 1.5491) < 0.0001, 'coordinates come through';
  assert d.atmosphere = 'Cosy' and d.rating_count = 2, 'scores and tags come through';
  assert (select display_name from public.public_ratings where overall = 9) = 'Dee Okafor', 'names shown';
  assert (select count(*) from public.public_ratings where overall = 7 and user_id is null and display_name is null) = 1, 'anonymous stays anonymous';
end $$;

reset role;
do $$ begin
  assert (select count(*) from public.pub_directory_near(53.80, -1.55, 2000)) = 1, 'near me finds the pub';
end $$;

\echo 'app_reads_test: ok'
