-- ratemyGuin for Pubs: plans are private, paid tools need a plan, offers follow the rules,
-- featured pubs run on dates, and none of it changes scores.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c9', 'landlord@example.com'),
  ('00000000-0000-0000-0000-0000000000ca', null);
insert into public.profiles (id, handle, display_name, created_at) values
  ('00000000-0000-0000-0000-0000000000c9', 'landlord_c9', 'Landlord', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000ca', 'drinker_ca', 'Drinker', now() - interval '1 year');
insert into public.pubs (id, name, address, city, country, location) values
  ('00000000-0000-0000-0000-000000000c91', 'The Paying Arms', '1 Plan St', 'York', 'United Kingdom', 'SRID=4326;POINT(-1.08 53.96)'),
  ('00000000-0000-0000-0000-000000000c92', 'The Neighbour', '2 Plan St', 'York', 'United Kingdom', 'SRID=4326;POINT(-1.081 53.96)');
insert into public.pub_staff (pub_id, user_id, role) values ('00000000-0000-0000-0000-000000000c91', '00000000-0000-0000-0000-0000000000c9', 'owner');

-- Some ratings: good a while ago, worse in the last fortnight (back-dated, so skip the visit rules).
set session_replication_role = replica;
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, tags, rated_at)
select '00000000-0000-0000-0000-000000000c91', '00000000-0000-0000-0000-0000000000ca', 9, 9, 9, 9, 9, 9, '{creamy}', now() - make_interval(days => 20 + g * 5)
from generate_series(1, 4) g;
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, tags, rated_at)
select '00000000-0000-0000-0000-000000000c91', '00000000-0000-0000-0000-0000000000ca', 6, 6, 5, 6, 6, 6, '{flat}', now() - make_interval(days => g)
from generate_series(1, 3) g;
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, tags, rated_at)
values ('00000000-0000-0000-0000-000000000c92', '00000000-0000-0000-0000-0000000000ca', 8, 8, 8, 8, 8, 8, '{two_part_pour,creamy}', now() - interval '3 days');
set session_replication_role = origin;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c9';

-- Without a plan: no paid tools, no events, no offers.
do $$ begin
  perform public.pub_local_comparison('00000000-0000-0000-0000-000000000c91');
  raise exception 'comparison needs a plan';
exception when sqlstate 'P0402' then null;
end $$;
do $$ begin
  insert into public.pub_events (pub_id, kind, title, starts_at) values ('00000000-0000-0000-0000-000000000c91', 'quiz', 'Quiz night', now() + interval '2 days');
  raise exception 'events need a plan';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  assert (select count(*) from public.pub_plans) = 0, 'no plan yet';
end $$;

-- A moderator grants a trial.
reset role;
select public.grant_pub_plan('00000000-0000-0000-0000-000000000c91', 30);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c9';
do $$ declare c jsonb; begin
  assert (select status from public.pub_plans where pub_id = '00000000-0000-0000-0000-000000000c91') = 'trialing', 'owner sees their plan';
  c := public.pub_local_comparison('00000000-0000-0000-0000-000000000c91');
  assert jsonb_array_length(c->'pubs') >= 2 and c->'pubs' @> '[{"name": "The Neighbour"}, {"you": true}]', 'you and your neighbour';
  assert (c->'praise'->'two_part_pour'->>'nearby')::numeric > 0, 'praise nearby is counted';
  assert exists (select 1 from public.pub_best_times('00000000-0000-0000-0000-000000000c91')), 'best times';
  assert exists (select 1 from public.pub_alerts('00000000-0000-0000-0000-000000000c91') where part = 'temperature'), 'temperature dip is flagged';
end $$;
insert into public.pub_events (pub_id, kind, title, starts_at) values ('00000000-0000-0000-0000-000000000c91', 'quiz', 'Quiz night', now() + interval '2 days');
insert into public.offers (pub_id, kind, title, ends_on) values ('00000000-0000-0000-0000-000000000c91', 'food', 'Pie and a pint for £15', current_date + 6);
do $$ begin
  insert into public.offers (pub_id, kind, title, ends_on) values ('00000000-0000-0000-0000-000000000c91', 'pint', 'Bottomless Guinness brunch', current_date + 6);
  raise exception 'irresponsible offer should fail';
exception when check_violation then null;
end $$;
do $$ begin
  insert into public.offers (pub_id, kind, title, ends_on) values ('00000000-0000-0000-0000-000000000c91', 'pint', 'Buy 3 get 1 free', current_date + 6);
  raise exception 'irresponsible offer should fail';
exception when check_violation then null;
end $$;

-- Drinkers: see events and offers, but never the plan, and cannot call paid tools or helpers.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ca';
do $$ begin
  assert (select count(*) from public.pub_plans) = 0, 'plans are private';
  assert (select count(*) from public.pub_events where pub_id = '00000000-0000-0000-0000-000000000c91') = 1, 'events are public';
  assert (select count(*) from public.offers_near(53.96, -1.08, 1000)) = 1, 'offer near me';
end $$;
do $$ begin
  perform public.pub_best_times('00000000-0000-0000-0000-000000000c91');
  raise exception 'drinkers cannot see best times';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.grant_pub_plan('00000000-0000-0000-0000-000000000c92', 365);
  raise exception 'drinkers cannot grant plans';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  insert into public.featured_pubs (pub_id, ends_on) values ('00000000-0000-0000-0000-000000000c92', current_date + 30);
  raise exception 'drinkers cannot feature pubs';
exception when insufficient_privilege then null;
end $$;

-- Featured pubs show while running; the plan does not change scores.
reset role;
select public.feature_pub('00000000-0000-0000-0000-000000000c92', 7);
insert into public.featured_pubs (pub_id, starts_on, ends_on) values ('00000000-0000-0000-0000-000000000c91', current_date - 10, current_date - 3);
do $$ declare n int; begin
  assert (select count(*) from public.featured_now where id in ('00000000-0000-0000-0000-000000000c91', '00000000-0000-0000-0000-000000000c92')) = 1, 'only running features show';
  assert (select city from public.featured_pubs where pub_id = '00000000-0000-0000-0000-000000000c92') = 'York', 'feature defaults to the pub city';
  select count(*) into n from private.alerts_to_send() where pub_id = '00000000-0000-0000-0000-000000000c91';
  assert n >= 1, 'alert queued';
  select count(*) into n from private.alerts_to_send() where pub_id = '00000000-0000-0000-0000-000000000c91';
  assert n = 0, 'alerts are sent once a week';
end $$;

-- Offers found on a pub's website need a source and come after the pub's own offers.
do $$ begin
  insert into public.offers (pub_id, kind, title, ends_on, source) values ('00000000-0000-0000-0000-000000000c92', 'food', 'Steak night £20', current_date + 6, 'web');
  raise exception 'web offers need a source';
exception when check_violation then null;
end $$;
insert into public.offers (pub_id, kind, title, ends_on, source, source_url, found_on)
values ('00000000-0000-0000-0000-000000000c92', 'food', 'Steak night £20', current_date + 6, 'web', 'https://example.com/offers', current_date);
do $$ begin
  assert (select source from public.offers_near(53.96, -1.0805, 1000) limit 1) = 'pub', 'pub offers first';
  assert (select count(*) from public.offers_near(53.96, -1.0805, 1000)) = 2, 'both offers near';
end $$;

-- App Store: 18+ sign-up, blocking, photo reports, delete account.
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000cb');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000cb';
do $$ begin
  insert into public.profiles (id, handle, display_name) values (auth.uid(), 'too_young_cb', 'Kid');
  raise exception 'profiles need the 18+ confirmation';
exception when check_violation then null;
end $$;
insert into public.profiles (id, handle, display_name, adult_confirmed_at) values (auth.uid(), 'grown_up_cb', 'Adult', now());
do $$ declare n int; begin
  select count(*) into n from public.public_ratings where pub_id = '00000000-0000-0000-0000-000000000c91';
  assert n > 0, 'sees ratings before blocking';
  perform public.block_rating_author((select id from public.public_ratings where pub_id = '00000000-0000-0000-0000-000000000c91' limit 1));
  assert (select count(*) from public.public_ratings where pub_id = '00000000-0000-0000-0000-000000000c91') = 0, 'blocked rater hidden';
  assert (select count(*) from public.blocks) = 1, 'block saved';
end $$;

-- Two photo reports hide the photo.
reset role;
update public.ratings set photo_path = 'x/y.jpg' where pub_id = '00000000-0000-0000-0000-000000000c92';
insert into public.rating_reports (rating_id, reporter, reason)
select id, '00000000-0000-0000-0000-0000000000c9', 'photo' from public.ratings where pub_id = '00000000-0000-0000-0000-000000000c92';
insert into public.rating_reports (rating_id, reporter, reason)
select id, '00000000-0000-0000-0000-0000000000cb', 'photo' from public.ratings where pub_id = '00000000-0000-0000-0000-000000000c92';
do $$ begin
  assert (select photo_path from public.public_ratings where pub_id = '00000000-0000-0000-0000-000000000c92') is null, 'reported photo hidden';
end $$;
-- Deleting the account removes the person.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000cb';
select public.delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000cb'), 'profile gone';
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000cb'), 'login gone';
end $$;
