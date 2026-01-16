-- 1. Enable Chat Reactions
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- 2. Enable Product Descriptions for Rebirth
ALTER TABLE rebirth_items 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'No description provided.';
