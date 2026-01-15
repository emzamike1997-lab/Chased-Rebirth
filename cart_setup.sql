-- ==========================================
-- CHASED: Persistent Cart Setup
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create Cart Items Table
create table if not exists cart_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  product_name text not null,
  price numeric not null,
  image_url text,
  quantity int default 1,
  rebirth_item_id bigint references rebirth_items(id), -- Optional link if it's a unique item
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Row Level Security (RLS)
alter table cart_items enable row level security;

-- 3. Policies
-- Users can view their own cart
create policy "Users can view their own cart items"
  on cart_items for select
  using ( auth.uid() = user_id );

-- Users can insert into their own cart
create policy "Users can insert into their own cart"
  on cart_items for insert
  with check ( auth.uid() = user_id );

-- Users can delete from their own cart
create policy "Users can delete their own cart items"
  on cart_items for delete
  using ( auth.uid() = user_id );

-- Users can update their own cart (e.g. quantity)
create policy "Users can update their own cart items"
  on cart_items for update
  using ( auth.uid() = user_id );
