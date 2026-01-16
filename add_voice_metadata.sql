-- Add voice_metadata column to messages table to store duration and other details
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_metadata JSONB DEFAULT '{}'::jsonb;
