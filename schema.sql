-- Everything Mall starter schema
-- Run this file in Supabase SQL Editor.
-- Demo seed products are inserted into a public catalogue. They are sample data only.

create extension if not exists pgcrypto;

create type public.store_status as enum ('pending', 'active', 'suspended');
create type public.product_status as enum ('draft', 'active', 'archived');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  status public.store_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  emoji text not null default '🛍️',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete set null,
  category_id text not null references public.categories(id),
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  badge text not null default '',
  emoji text not null default '🛍️',
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_status_idx on public.products(category_id, status);
create index if not exists products_name_idx on public.products using gin (to_tsvector('english', name || ' ' || description));
create index if not exists stores_owner_idx on public.stores(owner_id);

-- Keep profile creation safe: user metadata is not allowed to assign roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Active categories are public" on public.categories;
create policy "Active categories are public"
on public.categories for select to anon, authenticated
using (is_active = true);

drop policy if exists "Active stores are public" on public.stores;
create policy "Active stores are public"
on public.stores for select to anon, authenticated
using (status = 'active');

drop policy if exists "Owners can view own stores" on public.stores;
create policy "Owners can view own stores"
on public.stores for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can create pending stores" on public.stores;
create policy "Owners can create pending stores"
on public.stores for insert to authenticated
with check ((select auth.uid()) = owner_id and status = 'pending');

drop policy if exists "Active products are public" on public.products;
create policy "Active products are public"
on public.products for select to anon, authenticated
using (status = 'active');

-- IMPORTANT: Product insert/update/delete policies are intentionally omitted in this starter.
-- Seller write permissions should be added only after a server-controlled seller approval
-- mechanism and a policy that verifies the product's store owner and active store status.

insert into public.categories (id, name, emoji, sort_order) values
('fashion','Fashion','👟',1),
('electronics','Electronics','🎧',2),
('home','Home','🛋️',3),
('beauty','Beauty','🧴',4),
('grocery','Grocery','🥑',5),
('services','Services','🧰',6),
('food','Food','🍜',7),
('travel','Travel','✈️',8)
on conflict (id) do update set name = excluded.name, emoji = excluded.emoji, sort_order = excluded.sort_order;

-- Demo products. These are illustrative records, not real offers.
insert into public.products (category_id, name, description, price, compare_at_price, rating, badge, emoji, status)
select v.category_id, v.name, v.description, v.price, v.compare_at_price, v.rating, v.badge, v.emoji, 'active'::public.product_status
from (values
('electronics','Everyday Wireless Headphones','Demo listing for everyday listening.',1499::numeric,1999::numeric,4.7::numeric,'Bestseller','🎧'),
('fashion','Urban Everyday Sneakers','Demo listing for everyday wear.',1299,1799,4.5,'Popular','👟'),
('home','Minimal Desk Lamp','Sample desk lamp listing.',899,1199,4.6,'New','💡'),
('home','Daily Hydration Bottle','Sample reusable bottle listing.',499,699,4.4,'Daily pick','🥤'),
('beauty','Glow Care Essentials Set','Sample personal-care listing. Review ingredients before use.',799,999,4.3,'Value set','🧴'),
('grocery','Fresh Pantry Starter Box','Illustrative grocery bundle.',649,749,4.2,'Daily needs','🥑'),
('services','Home Cleaning Visit','Demo service listing; booking is not enabled.',599,null,4.8,'Demo service','🧹'),
('food','Cafe Combo for Two','Sample food listing; ordering is not enabled.',399,499,4.5,'Demo menu','🍜'),
('travel','Weekend Getaway Planner','Demo discovery listing; not a bookable package.',0,null,4.6,'Explore','🏕️'),
('electronics','Smart Fitness Watch','Sample gadget listing.',2199,2799,4.4,'Trending','⌚'),
('fashion','Canvas Everyday Tote','Sample everyday bag listing.',349,499,4.1,'','👜'),
('home','Cozy Cushion Pair','Sample home decor listing.',699,899,4.4,'','🛋️')
) as v(category_id,name,description,price,compare_at_price,rating,badge,emoji)
where not exists (
  select 1 from public.products p where p.name = v.name and p.store_id is null
);

-- This starter uses no custom role table. Never grant admin privileges from user-editable metadata.
-- Add production seller write policies only after seller verification is implemented.
