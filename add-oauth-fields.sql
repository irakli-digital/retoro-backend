-- Add OAuth fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS apple_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS google_user_id TEXT UNIQUE;

-- Create indexes for OAuth fields
CREATE INDEX IF NOT EXISTS apple_user_id_idx ON users(apple_user_id);
CREATE INDEX IF NOT EXISTS google_user_id_idx ON users(google_user_id);
