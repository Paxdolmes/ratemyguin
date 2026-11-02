-- Phase 4: owners update venue details (never scores), see insights, reply; claims need approval.
\set ON_ERROR_STOP on

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b7'), ('00000000-0000-0000-0000-0000000000b8');
insert into public.profiles (id, handle, display_name, created_at) values
  ('00000000-0000-0000-0000-0000000000b7', 'landlady', 'Landlady', now() - interval '1 year'),
  ('00000000-0000-0000-0000-0000000000b8', 'drinker_b8', 'Drinker', now() - interval '1 year');
insert into public.pubs (id, name, address, city, country, location) values
  ('00000000-0000-0000-0000-000000000b71', 'The Owned Arms', '1 Own St', 'Derby', 'United Kingdom', 'SRID=4326;POINT(-1.47 52.92)');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b8';
insert into public.ratings (pub_id, user_id, overall, taste, temperature, head, texture, pour, tags)
values ('00000000-0000-0000-0000-000000000b71', auth.uid(), 6, 6, 6, 6, 6, 6, '{flat,thin_head}');

-- Before approval the landlady can claim, but not update or see insights.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b7';
insert into public.pub_claims (id, pub_id, user_id, evidence)
values ('00000000-0000-0000-0000-00000000b7c1', '00000000-0000-0000-0000-000000000b71', auth.uid(), 'Licence 123');
update public.pubs set venue_note = 'Hacked' where id = '00000000-0000-0000-0000-000000000b71';
do $$ begin
  perform public.pub_insights('00000000-0000-0000-0000-000000000b71');
  raise exception 'insights should be staff only';
exception when insufficient_privilege then null;
end $$;
reset role;
do $$ begin
  assert (select venue_note from public.pubs where id = '00000000-0000-0000-0000-000000000b71') is null, 'unapproved owner cannot edit';
end $$;
select public.approve_claim('00000000-0000-0000-0000-00000000b7c1');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b7';
update public.pubs set venue_note = 'Lines cleaned weekly', lines_cleaned_on = current_date, accreditations = '{cask_marque}',
  owner_features = '{guinness_zero}', venue_updated_at = now() where id = '00000000-0000-0000-0000-000000000b71';
do $$ begin
  update public.pubs set name = 'Best Pub Ever' where id = '00000000-0000-0000-0000-000000000b71';
  raise exception 'owners cannot rename';
exception when insufficient_privilege then null;
end $$;
do $$ declare i jsonb; begin
  i := public.pub_insights('00000000-0000-0000-0000-000000000b71');
  assert (i->'tags_recent'->>'flat')::int = 1 and (i->>'unanswered')::int = 1, 'insights: ' || i::text;
end $$;
insert into public.pub_responses (rating_id, pub_id, author, body)
select id, pub_id, auth.uid(), 'Sorry, we have had the lines cleaned since.' from public.public_ratings where pub_id = '00000000-0000-0000-0000-000000000b71';
update public.pub_responses set body = 'Sorry, lines cleaned since.' where pub_id = '00000000-0000-0000-0000-000000000b71';

set role anon;
do $$ declare d record; begin
  select * into d from public.pub_directory where id = '00000000-0000-0000-0000-000000000b71';
  assert d.claimed and d.venue_note = 'Lines cleaned weekly' and d.accreditations = '{cask_marque}', 'venue details are public';
  assert d.features @> '{guinness_zero}', 'owner features show';
  assert (select reply from public.public_ratings where pub_id = d.id) = 'Sorry, lines cleaned since.', 'reply is public';
end $$;
reset role;
