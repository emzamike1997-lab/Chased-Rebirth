-- ==========================================
-- CHASED: Checkout & Orders Setup
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Add 'status' column to rebirth_items if it doesn't exist
alter table rebirth_items 
add column if not exists status text default 'active';

-- 2. Create Orders Table
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  total_amount numeric not null,
  status text default 'pending', -- pending, paid, shipped
  shipping_address jsonb, -- Stores name, address, city, zip
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Order Items Table
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders not null,
  product_name text not null,
  price numeric not null,
  quantity int default 1,
  rebirth_item_id bigint references rebirth_items(id), -- Optional: Link to specific unique item
  image_url text
);

-- 4. Enable RLS
alter table orders enable row level security;
alter table order_items enable row level security;

-- 5. RLS Policies

-- Orders: Users can view their own orders
create policy "Users can view own orders"
  on orders for select
  using ( auth.uid() = user_id );

-- Orders: Users can create orders
create policy "Users can create orders"
  on orders for insert
  with check ( auth.uid() = user_id );

-- Order Items: Users can view their own order items
create policy "Users can view own order items"
  on order_items for select
  using ( 
    exists ( 
      select 1 from orders 
      where orders.id = order_items.order_id 
      and orders.user_id = auth.uid() 
    ) 
  );

-- Order Items: Users can insert order items (linked to their order)
create policy "Users can insert order items"
  on order_items for insert
  with check ( 
    exists ( 
      select 1 from orders 
      where orders.id = order_items.order_id 
      and orders.user_id = auth.uid() 
    ) 
  );
