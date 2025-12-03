-- Add is_kept and kept_date columns to return_items table
-- Migration: add_is_kept_column
-- Date: 2025-12-03

ALTER TABLE return_items
ADD COLUMN IF NOT EXISTS is_kept BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE return_items
ADD COLUMN IF NOT EXISTS kept_date TIMESTAMP;

-- Create index on is_kept for efficient queries
CREATE INDEX IF NOT EXISTS is_kept_idx ON return_items(is_kept);

COMMENT ON COLUMN return_items.is_kept IS 'Whether the item was kept instead of returned';
COMMENT ON COLUMN return_items.kept_date IS 'Date when the item was marked as kept';
