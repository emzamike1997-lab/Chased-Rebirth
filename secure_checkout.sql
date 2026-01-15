-- ==========================================
-- CHASED: Secure Checkout Setup
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Add Status to Items (if not exists)
alter table rebirth_items 
add column if not exists status text default 'active';

-- 2. Create Orders Table
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  total_amount numeric not null,
  status text default 'paid',
  shipping_address jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Order Items Table
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders not null,
  product_name text not null,
  price numeric not null,
  quantity int not null,
  rebirth_item_id bigint references rebirth_items(id), -- Optional link
  image_url text
);

-- 4. RLS for Orders
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Users can view their own orders"
  on orders for select
  using ( auth.uid() = user_id );

create policy "Users can create orders"
  on orders for insert
  with check ( auth.uid() = user_id );

create policy "Users can view their own order items"
  on order_items for select
  using ( 
    exists ( select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid() )
  );

create policy "Users can insert order items"
  on order_items for insert
  with check ( 
    exists ( select 1 from orders where orders.id = order_id and orders.user_id = auth.uid() )
  );

-- 5. Secure Function to Mark Item as Sold
-- This bypasses RLS for the specific action of buying an item
create or replace function mark_item_sold(item_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update rebirth_items
  set status = 'sold'
  where id = item_id
  and status = 'active';
end;
$$;
