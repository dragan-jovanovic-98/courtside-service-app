-- Add timezone column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone text;
