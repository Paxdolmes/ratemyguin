-- Logos and photos reach the apps through the directory and the nearby search.
\set ON_ERROR_STOP on

insert into public.pubs (id, name, address, city, country, location, website, brand, logo_url, image_url) values
  ('00000000-0000-0000-0000-000000000d01', 'The Logo Arms', '3 Test St', 'York', 'United Kingdom',
   'SRID=4326;POINT(-1.0815 53.9600)', 'https://logoarms.example', 'Fuller''s',
   'https://logoarms.example/logo.png', 'https://upload.wikimedia.org/arms.jpg');

set role anon;
do $$ declare d record; begin
  select * into d from public.pub_directory_near(53.9600, -1.0815, 500) where id = '00000000-0000-0000-0000-000000000d01';
  assert d.logo_url = 'https://logoarms.example/logo.png', 'logo comes through the nearby search';
  assert d.image_url like 'https://upload.wikimedia.org/%' and d.brand = 'Fuller''s' and d.website is not null, 'photo, brand and website come through';
end $$;
reset role;
