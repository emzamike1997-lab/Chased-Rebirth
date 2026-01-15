-- Run this if your 'messages' table already exists
-- It adds the missing column for the new Quoting feature

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reply_to_id') THEN
        ALTER TABLE messages ADD COLUMN reply_to_id uuid references messages(id);
    END IF;
END $$;
