-- Click-out log. One row per click to a partner; `id` is the sub-ID sent to the partner,
-- so partner conversion reports can be joined back to the page/route that earned them.
create table if not exists public.clicks (
  id            text primary key,
  created_at    timestamptz not null default now(),
  partner       text not null check (partner in ('aviasales', 'travelstart')),
  origin        char(3) not null,
  destination   char(3) not null,
  depart_date   date not null,
  return_date   date,
  price_shown   integer,
  source_page   text,
  device        text not null default 'unknown',
  referrer      text,
  utm_source    text,
  utm_campaign  text
);

create index if not exists clicks_created_at_idx on public.clicks (created_at desc);
create index if not exists clicks_route_idx on public.clicks (origin, destination);

-- Only the server (service role) writes or reads. No public policies = anon/authenticated get nothing.
alter table public.clicks enable row level security;

-- Partner-reported conversions, imported later (Impact / Travelpayouts reports), joined on sub_id = clicks.id.
create table if not exists public.conversions (
  id               bigint generated always as identity primary key,
  partner          text not null,
  sub_id           text not null,
  booked_at        timestamptz,
  status           text not null default 'pending',
  commission       numeric(12, 2),
  currency         char(3) not null default 'ZAR',
  imported_at      timestamptz not null default now(),
  unique (partner, sub_id, booked_at)
);

create index if not exists conversions_sub_id_idx on public.conversions (sub_id);

alter table public.conversions enable row level security;

-- Revenue per page: what actually earned money.
create or replace view public.revenue_by_page
with (security_invoker = true) as
select
  c.source_page,
  count(distinct c.id)                                  as clicks,
  count(v.id)                                           as bookings,
  coalesce(sum(v.commission) filter (where v.status <> 'rejected'), 0) as commission
from public.clicks c
left join public.conversions v on v.sub_id = c.id
group by c.source_page;
