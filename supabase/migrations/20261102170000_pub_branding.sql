-- More than a name: each pub's website, brand, and a logo or photo found for it.
alter table public.pubs
  add column website text,
  add column brand text,
  add column brand_wikidata text,
  add column image_url text, -- a photo of the pub (from OpenStreetMap / Wikimedia Commons)
  add column logo_url text,  -- the pub's or brand's logo, found automatically or set by the owner
  add column logo_checked_at timestamptz;

create or replace view public.pub_directory with (security_invoker = false) as
select p.id, p.name, p.address, p.neighbourhood, p.city, p.country, p.atmosphere, p.opening_hours,
  extensions.st_y(p.location::extensions.geometry) as lat,
  extensions.st_x(p.location::extensions.geometry) as lng,
  s.rating_count, s.verified_share, s.average_overall, s.pour, s.taste_temperature, s.consistency,
  s.atmosphere_service, s.value, s.median_price_pence, s.excellence_index, s.award,
  p.website, p.brand, p.logo_url, p.image_url
from public.pubs p join public.pub_scores s on s.pub_id = p.id;
