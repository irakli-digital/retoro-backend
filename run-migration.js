// Script to run the is_kept column migration
require('dotenv').config();
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('Running migration: add_is_kept_column...');

  const migrationSQL = fs.readFileSync('./migrations/add_is_kept_column.sql', 'utf8');

  try {
    // Add is_kept column
    console.log('Adding is_kept column...');
    await sql`
      ALTER TABLE return_items
      ADD COLUMN IF NOT EXISTS is_kept BOOLEAN DEFAULT false NOT NULL
    `;

    // Add kept_date column
    console.log('Adding kept_date column...');
    await sql`
      ALTER TABLE return_items
      ADD COLUMN IF NOT EXISTS kept_date TIMESTAMP
    `;

    // Create index
    console.log('Creating index on is_kept...');
    await sql`
      CREATE INDEX IF NOT EXISTS is_kept_idx ON return_items(is_kept)
    `;

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
