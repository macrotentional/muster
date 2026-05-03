create extension if not exists "uuid-ossp";

create type item_condition as enum ('good', 'damaged', 'retired');
create type return_condition as enum ('good', 'damaged', 'lost');
create type damage_severity as enum ('minor', 'major', 'unusable');

create table items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  size text,
  asset_tag text unique,
  condition item_condition not null default 'good',
  storage_location text,
  notes text,
  created_at timestamptz not null default now()
);

create table checkouts (
  id uuid primary key default uuid_generate_v4(),
  borrower_name text not null,
  borrower_email text,
  borrower_phone text,
  checked_out_by text not null,
  checked_out_at timestamptz not null default now(),
  expected_return_at timestamptz,
  notes text
);

create table checkout_items (
  id uuid primary key default uuid_generate_v4(),
  checkout_id uuid not null references checkouts(id) on delete cascade,
  item_id uuid not null references items(id),
  checked_in_at timestamptz,
  checked_in_by text,
  condition_on_return return_condition,
  return_notes text
);

-- Prevents the same item being checked out twice simultaneously
create unique index unique_active_checkout on checkout_items(item_id)
  where checked_in_at is null;

create table damage_logs (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items(id),
  reported_by text not null,
  reported_at timestamptz not null default now(),
  description text not null,
  severity damage_severity not null,
  checkout_id uuid references checkouts(id)
);

create index on checkout_items(item_id);
create index on checkout_items(checkout_id);
create index on damage_logs(item_id);

-- View used by the app for live status queries
create view item_status as
select
  i.id,
  i.name,
  i.category,
  i.size,
  i.asset_tag,
  i.condition,
  i.storage_location,
  i.notes,
  i.created_at,
  ci.id as checkout_item_id,
  c.id as checkout_id,
  c.borrower_name,
  c.checked_out_at,
  c.expected_return_at,
  c.checked_out_by,
  case when ci.id is not null then 'checked_out' else 'available' end as status
from items i
left join checkout_items ci on ci.item_id = i.id and ci.checked_in_at is null
left join checkouts c on c.id = ci.checkout_id;

-- Disable RLS for prototype (enable and add policies before any production use)
alter table items disable row level security;
alter table checkouts disable row level security;
alter table checkout_items disable row level security;
alter table damage_logs disable row level security;

-- Enable real-time for live dashboard updates
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table checkout_items;
