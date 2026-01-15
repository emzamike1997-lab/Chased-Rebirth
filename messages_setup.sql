-- ==========================================
-- CHASED: Messaging System Setup
-- ==========================================

-- 1. Create Conversations Table
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  buyer_id uuid references auth.users not null,
  seller_id uuid references auth.users not null,
  item_id bigint references rebirth_items(id), -- Optional link to item context
  item_title text, -- Snapshot of item title in case it gets deleted
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Messages Table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references auth.users not null,
  content text not null,
  reply_to_id uuid references messages(id), -- Self-reference for quotes
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. RLS Policies
alter table conversations enable row level security;
alter table messages enable row level security;

-- Conversations Policies
create policy "Users can view their own conversations"
  on conversations for select
  using ( auth.uid() = buyer_id or auth.uid() = seller_id );

create policy "Users can insert conversations they are part of"
  on conversations for insert
  with check ( auth.uid() = buyer_id );

-- Messages Policies
create policy "Users can view messages in their conversations"
  on messages for select
  using ( exists (
    select 1 from conversations
    where conversations.id = messages.conversation_id
    and (conversations.buyer_id = auth.uid() or conversations.seller_id = auth.uid())
  ));

create policy "Users can send messages to their conversations"
  on messages for insert
  with check ( exists (
    select 1 from conversations
    where conversations.id = messages.conversation_id
    and (conversations.buyer_id = auth.uid() or conversations.seller_id = auth.uid())
  ));

-- 4. Realtime
-- Enable realtime for immediate message delivery
alter publication supabase_realtime add table messages;
