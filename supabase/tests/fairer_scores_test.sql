-- Phase 1 scoring: tags, separate Pint and Pub scores, rater bias, price freshness, reports.
\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2'),
  ('00000000-0000-0000-0000-0000000000e3'), ('00000000-0000-0000-0000-0000000000e4');
insert into public.profiles (id, handle, display_name, created_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'fair_one', 'One', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000e2', 'fair_two', 'Two', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000e3', 'fair_three', 'Three', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000e4', 'gushing', 'Gush', now() - interval '1 year');
insert into public.pubs (id, name, address, city, country, location) values
  ('00000000-0000-0000-0000-000000000e01', 'The Fine Pint', '1 Fair St', 'Leeds', 'United Kingdom', 'SRID=4326;POINT(-1.5491 53.8008)'),
  ('00000000-0000-0000-0000-000000000e02', 'The Lovely Room', '2 Fair St', 'Leeds', 'United Kingdom', 'SRID=4326;POINT(-1.5591 53.8008)');

set role authenticated;

-- Tags and the visit date are saved; unknown tags are refused.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, atmosphere, price_pence, tags, visited_on)
values ('00000000-0000-0000-0000-000000000e01', auth.uid(), 9, 9, 9, 9, 9, 9, 5, 600, '{two_part_pour,creamy}', current_date),
       ('00000000-0000-0000-0000-000000000e02', auth.uid(), 5, 5, 5, 5, 5, 5, 10, 600, '{flat}', current_date);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e4';
do $$ begin
  insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, tags)
  values ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-0000000000e4', 9, 9, 9, 9, 9, 9, '{amazing}');
  raise exception 'unknown tag should fail';
exception when check_violation then null;
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, atmosphere, price_pence)
values ('00000000-0000-0000-0000-000000000e01', auth.uid(), 9, 9, 9, 9, 9, 9, 5, 620),
       ('00000000-0000-0000-0000-000000000e02', auth.uid(), 5, 5, 5, 5, 5, 5, 10, 620);
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, atmosphere)
values ('00000000-0000-0000-0000-000000000e01', auth.uid(), 9, 9, 9, 9, 9, 9, 5),
       ('00000000-0000-0000-0000-000000000e02', auth.uid(), 5, 5, 5, 5, 5, 5, 10);

-- A great pint in a dull room beats a poor pint in a lovely room on the Pint score,
-- and the other way round on the Pub score.
reset role;
do $$ declare a record; b record; begin
  select * into a from public.pub_directory where id = '00000000-0000-0000-0000-000000000e01';
  select * into b from public.pub_directory where id = '00000000-0000-0000-0000-000000000e02';
  assert a.pint_score > b.pint_score, 'pint score follows the glass';
  assert b.pub_score > a.pub_score, 'pub score follows the room';
  assert a.pub_score = 50 and b.pub_score = 100, 'pub score is atmosphere out of 100';
  assert a.price_updated_at is not null and b.price_updated_at is not null, 'price freshness is shown';
  assert not a.under_review, 'a normal pub is not under review';
end $$;

-- Someone who scores everything 10 is pulled back towards the crowd.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e4';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour)
values ('00000000-0000-0000-0000-000000000e01', auth.uid(), 10, 10, 10, 10, 10, 10),
       ('00000000-0000-0000-0000-000000000e02', auth.uid(), 10, 10, 10, 10, 10, 10);
reset role;
do $$ begin
  assert (select bias from public.rater_bias where user_id = '00000000-0000-0000-0000-0000000000e4') > 0.5, 'generous rater has a positive bias';
  assert (select abs(bias) from public.rater_bias where user_id = '00000000-0000-0000-0000-0000000000e1') < 0.5, 'typical rater has little bias';
end $$;

-- Reports: you can report as yourself, and nobody can read reports through the API.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into public.rating_reports (rating_id, reason)
select id, 'fake' from public.ratings where user_id = '00000000-0000-0000-0000-0000000000e4' limit 1;
do $$ begin
  assert (select count(*) from public.rating_reports) = 0, 'reports are not readable';
end $$;
do $$ begin
  perform * from public.rater_bias;
  raise exception 'rater_bias should not be readable';
exception when insufficient_privilege then null;
end $$;

-- Tags come through the public ratings.
do $$ begin
  assert (select tags from public.public_ratings where pub_id = '00000000-0000-0000-0000-000000000e01'
          and user_id = '00000000-0000-0000-0000-0000000000e1') = '{two_part_pour,creamy}', 'tags are public';
end $$;
reset role;
