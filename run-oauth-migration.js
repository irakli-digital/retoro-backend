import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Running OAuth fields migration...');

    // Add OAuth columns to users table
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS apple_user_id TEXT,
      ADD COLUMN IF NOT EXISTS google_user_id TEXT
    `;

    // Add unique constraints
    await sql`
      ALTER TABLE users
      ADD CONSTRAINT users_apple_user_id_unique UNIQUE (apple_user_id)
    `.catch(() => console.log('   (apple_user_id unique constraint already exists)'));

    await sql`
      ALTER TABLE users
      ADD CONSTRAINT users_google_user_id_unique UNIQUE (google_user_id)
    `.catch(() => console.log('   (google_user_id unique constraint already exists)'));

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS apple_user_id_idx ON users(apple_user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS google_user_id_idx ON users(google_user_id)`;

    console.log('✅ Migration completed successfully!');
    console.log('   - Added apple_user_id column to users table');
    console.log('   - Added google_user_id column to users table');
    console.log('   - Created indexes for OAuth fields');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
