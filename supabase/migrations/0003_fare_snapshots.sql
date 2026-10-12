-- Our own price history, written daily by scripts/snapshot-fares.ts (.github/workflows/snapshot-fares.yml).
-- One row per route and departure month per day. Over time this shows which months are cheapest to fly and how
-- prices move as departure gets closer: data the partner API doesn't keep (its cache holds prices for ~2-7 days).
create table public.fare_snapshots (
  snapshot_date   date        not null,          -- South African date the snapshot was taken
  origin          char(3)     not null,
  destination     char(3)     not null,
  depart_month    char(7)     not null check (depart_month ~ '^\d{4}-\d{2}$'),
  min_price       integer     not null check (min_price > 0),   -- whole rand, one way
  median_price    integer     not null check (median_price > 0),
  days_with_fares smallint    not null check (days_with_fares between 1 and 31),
  cheapest_date   date        not null,
  airline         text        not null,
  created_at      timestamptz not null default now(),
  primary key (snapshot_date, origin, destination, depart_month)
);

-- Charts read a route's history across snapshot days.
create index fare_snapshots_route_idx on public.fare_snapshots (origin, destination, depart_month, snapshot_date);

-- Server-side only, like clicks: RLS on and no policies, so only the service key can read or write.
alter table public.fare_snapshots enable row level security;
