-- Behaviour tests for verified ratings, anti-fraud, credibility and the Excellence Index.
-- Run with: supabase/tests/run.sh
\set ON_ERROR_STOP on

-- One pub in Fulham, one down the road, a landlord and three drinkers.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000a3'), ('00000000-0000-0000-0000-00000000000f');
insert into public.profiles (id, handle, display_name, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'aoife', 'Aoife', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000a2', 'ben', 'Ben', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000a3', 'cal', 'Cal', now()),
  ('00000000-0000-0000-0000-00000000000f', 'landlord', 'Fergal', now() - interval '1 year');
insert into public.pubs (id, name, address, neighbourhood, city, country, location) values
  ('00000000-0000-0000-0000-000000000b01', 'The Harp & Hound', '1 North End Rd', 'Fulham', 'London', 'United Kingdom', 'SRID=4326;POINT(-0.1956 51.4805)'),
  ('00000000-0000-0000-0000-000000000b02', 'The Crown', '9 Kings Rd', 'Chelsea', 'London', 'United Kingdom', 'SRID=4326;POINT(-0.1700 51.4870)');
insert into public.pub_staff values ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-00000000000f', 'owner');

set role authenticated;

-- Aoife rates from inside the pub: verified, full weight.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, atmosphere, price_pence, fix, fix_accuracy_m)
values ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-0000000000a1', 9, 9, 9, 9.5, 9, 9.5, 8, 620,
        'SRID=4326;POINT(-0.1957 51.4805)', 12);
do $$ begin
  assert (select verification from public.ratings where user_id = auth.uid()) = 'gps', 'in the pub verifies';
  assert (select weight from public.ratings where user_id = auth.uid()) > 0.5, 'seasoned rater has weight';
end $$;

-- A second rating of the same pub within 3 hours is refused.
do $$ begin
  insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour)
  values ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-0000000000a1', 10, 10, 10, 10, 10, 10);
  raise exception 'second rating should have failed';
exception when sqlstate 'P0001' then
  if sqlerrm not like '%last 3 hours%' then raise; end if;
end $$;

-- Ratings cannot be edited after the fact (weight and verification are server-set).
do $$ begin
  update public.ratings set weight = 2 where user_id = auth.uid();
  raise exception 'update should have failed';
exception when insufficient_privilege then null;
end $$;

-- Nobody can rate as someone else.
do $$ begin
  insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour)
  values ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-0000000000a2', 1, 1, 1, 1, 1, 1);
  raise exception 'impersonation should have failed';
exception when insufficient_privilege then null;
end $$;

-- Ben rates from home, 700 m away: posted, but unverified and light.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, fix, fix_accuracy_m)
values ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-0000000000a2', 8, 8, 8, 8, 8, 8,
        'SRID=4326;POINT(-0.1956 51.4868)', 10);
-- Ben can't see Aoife's raw rating (her location), only his own.
do $$ begin
  assert (select count(*) from public.ratings) = 1, 'raw ratings are private';
  assert (select verification from public.ratings) = 'none', 'from home is unverified';
  assert (select weight from public.ratings) < 0.6, 'unverified counts less';
  assert (select count(*) from public.public_ratings where pub_id = '00000000-0000-0000-0000-000000000b01') = 2, 'public view shows both';
end $$;

-- Cal is brand new and teleports: Fulham to Dublin in minutes is refused.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, fix, fix_accuracy_m)
values ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-0000000000a3', 9, 9, 9, 9, 9, 9,
        'SRID=4326;POINT(-0.1956 51.4805)', 10);
do $$ begin
  assert (select weight from public.ratings) < (select 0.7), 'brand-new account is discounted';
end $$;
do $$ begin
  insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, fix, fix_accuracy_m)
  values ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-0000000000a3', 9, 9, 9, 9, 9, 9,
          'SRID=4326;POINT(-6.2546 53.3438)', 10);
  raise exception 'teleport should have failed';
exception when sqlstate 'P0001' then
  if sqlerrm not like '%impossible%' then raise; end if;
end $$;

-- The landlord's rating of their own pub counts for nothing.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, fix, fix_accuracy_m)
values ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-00000000000f', 10, 10, 10, 10, 10, 10,
        'SRID=4326;POINT(-0.1956 51.4805)', 5);
do $$ begin
  assert (select weight from public.ratings) = 0, 'staff ratings weigh nothing';
end $$;

-- Excellence Index: three counted ratings → a score, but no award yet (needs 10).
do $$ declare s record; begin
  select * into s from public.pub_scores where pub_id = '00000000-0000-0000-0000-000000000b01';
  assert s.rating_count = 3, format('staff rating excluded, got %s', s.rating_count);
  assert s.excellence_index between 70 and 95, format('index %s', s.excellence_index);
  assert s.award is null, 'no award under 10 ratings';
  assert (select excellence_index from public.pub_scores where pub_id = '00000000-0000-0000-0000-000000000b02') is null, 'unrated pub has no index';
end $$;

-- The landlord replies publicly to Aoife's rating; a drinker can't reply as the pub.
insert into public.pub_responses (rating_id, pub_id, author, body)
select id, pub_id, '00000000-0000-0000-0000-00000000000f', 'Thanks Aoife, see you Friday.'
from public.public_ratings where user_id = '00000000-0000-0000-0000-0000000000a1';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  insert into public.pub_responses (rating_id, pub_id, author, body)
  select id, pub_id, '00000000-0000-0000-0000-0000000000a2', 'Fake reply'
  from public.public_ratings where user_id = '00000000-0000-0000-0000-0000000000a2';
  raise exception 'non-staff reply should have failed';
exception when insufficient_privilege then null;
end $$;

-- Best pubs near me puts the rated pub first.
do $$ begin
  assert (select name from public.pubs_near(51.4810, -0.1960, 3000) limit 1) = 'The Harp & Hound', 'near me ranking';
end $$;

reset role;
\echo 'ratings_test: ok'
