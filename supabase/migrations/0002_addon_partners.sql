-- Add-on partners (car hire, eSIM). Their clicks come from a route page, so they keep the route
-- (origin, destination) but have no flight date.
alter table public.clicks drop constraint if exists clicks_partner_check;
alter table public.clicks
  add constraint clicks_partner_check check (partner in ('aviasales', 'travelstart', 'discovercars', 'airalo'));
alter table public.clicks alter column depart_date drop not null;
