-- Phase 3: saved lists and favourites respect privacy.
\set ON_ERROR_STOP on

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d7'), ('00000000-0000-0000-0000-0000000000d8');
insert into public.profiles (id, handle, display_name, is_public, created_at) values
  ('00000000-0000-0000-0000-0000000000d7', 'list_maker', 'Maker', false, now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000d8', 'nosy_one', 'Nosy', true, now() - interval '1 year');
insert into public.pubs (id, name, address, city, country, location) values
  ('00000000-0000-0000-0000-000000000d71', 'The Listed', '1 List St', 'Hull', 'United Kingdom', 'SRID=4326;POINT(-0.33 53.74)');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d7';
insert into public.lists (id, name) values ('00000000-0000-0000-0000-00000000d701', 'Pubs to try with Dad');
insert into public.list_pubs (list_id, pub_id) values ('00000000-0000-0000-0000-00000000d701', '00000000-0000-0000-0000-000000000d71');
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour)
values ('00000000-0000-0000-0000-000000000d71', auth.uid(), 9, 9, 9, 9, 9, 9);
do $$ begin
  assert (select count(*) from public.list_pubs) = 1, 'owner sees their list';
  assert (select count(*) from public.favourites('00000000-0000-0000-0000-0000000000d7')) = 1, 'you see your own favourites';
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d8';
do $$ begin
  assert (select count(*) from public.lists) = 0, 'private lists are hidden';
  assert (select count(*) from public.favourites('00000000-0000-0000-0000-0000000000d7')) = 0, 'private favourites are hidden';
end $$;
do $$ begin
  insert into public.list_pubs (list_id, pub_id) values ('00000000-0000-0000-0000-00000000d701', '00000000-0000-0000-0000-000000000d71');
  raise exception 'should not add to someone else''s list';
exception when insufficient_privilege or unique_violation then null;
end $$;

-- Once Maker follows... no: once Nosy follows Maker, favourites are visible to Nosy.
insert into public.follows (follower, followee) values (auth.uid(), '00000000-0000-0000-0000-0000000000d7');
do $$ begin
  assert (select count(*) from public.favourites('00000000-0000-0000-0000-0000000000d7')) = 1, 'followers see favourites';
end $$;
reset role;

-- You can hide your name on your own rating, and nobody else's.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d8';
select public.set_rating_anonymous(id, true) from public.ratings where user_id = '00000000-0000-0000-0000-0000000000d7';
reset role;
do $$ begin
  assert not (select anonymous from public.ratings where user_id = '00000000-0000-0000-0000-0000000000d7'), 'others cannot change it';
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d7';
select public.set_rating_anonymous(id, true) from public.ratings where user_id = auth.uid();
reset role;
do $$ begin
  assert (select anonymous from public.ratings where user_id = '00000000-0000-0000-0000-0000000000d7'), 'owner can hide their name';
end $$;
