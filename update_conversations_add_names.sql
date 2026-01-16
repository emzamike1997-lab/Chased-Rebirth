-- Add buyer_name and seller_name columns to conversations table
-- This allows us to display usernames without needing admin API access

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS buyer_name TEXT,
ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- Update existing conversations with placeholder names
-- (These will be updated when users next interact with the conversation)
UPDATE conversations 
SET buyer_name = 'Buyer', 
    seller_name = 'Seller'
WHERE buyer_name IS NULL OR seller_name IS NULL;
