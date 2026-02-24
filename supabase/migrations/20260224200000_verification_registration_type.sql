-- Add registration_type column to verification table
ALTER TABLE verification ADD COLUMN IF NOT EXISTS registration_type text;
