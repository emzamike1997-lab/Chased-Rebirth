-- ==========================================
-- CHASED: Enable Edit/Delete for Items
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Allow users to DELETE their own items
create policy "Users can delete their own items"
  on rebirth_items for delete
  using ( auth.uid() = user_id );

-- 2. Allow users to UPDATE their own items
create policy "Users can update their own items"
  on rebirth_items for update
  using ( auth.uid() = user_id );
