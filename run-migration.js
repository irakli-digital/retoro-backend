// Script to create all database tables from scratch
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...\n');

    // Drop existing tables if they exist (in reverse order of dependencies)
    console.log('Dropping existing tables...');
    await sql`DROP TABLE IF EXISTS return_items CASCADE`;
    await sql`DROP TABLE IF EXISTS user_settings CASCADE`;
    await sql`DROP TABLE IF EXISTS magic_link_tokens CASCADE`;
    await sql`DROP TABLE IF EXISTS sessions CASCADE`;
    await sql`DROP TABLE IF EXISTS retailer_policies CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    console.log('✓ Existing tables dropped\n');

    // Create users table
    console.log('Creating users table...');
    await sql`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT,
        apple_user_id TEXT UNIQUE,
        google_user_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE NOT NULL
      )
    `;
    await sql`CREATE INDEX email_idx ON users(email)`;
    await sql`CREATE INDEX apple_user_id_idx ON users(apple_user_id)`;
    await sql`CREATE INDEX google_user_id_idx ON users(google_user_id)`;
    console.log('✓ users table created\n');

    // Create sessions table
    console.log('Creating sessions table...');
    await sql`
      CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anonymous_user_id TEXT,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    await sql`CREATE INDEX token_idx ON sessions(token)`;
    await sql`CREATE INDEX user_id_idx ON sessions(user_id)`;
    await sql`CREATE INDEX anonymous_user_id_idx ON sessions(anonymous_user_id)`;
    console.log('✓ sessions table created\n');

    // Create magic_link_tokens table
    console.log('Creating magic_link_tokens table...');
    await sql`
      CREATE TABLE magic_link_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    await sql`CREATE INDEX magic_token_idx ON magic_link_tokens(token)`;
    await sql`CREATE INDEX magic_email_idx ON magic_link_tokens(email)`;
    console.log('✓ magic_link_tokens table created\n');

    // Create retailer_policies table
    console.log('Creating retailer_policies table...');
    await sql`
      CREATE TABLE retailer_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        return_window_days INTEGER NOT NULL,
        website_url TEXT,
        return_portal_url TEXT,
        has_free_returns BOOLEAN DEFAULT FALSE NOT NULL,
        is_custom BOOLEAN DEFAULT FALSE NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    await sql`CREATE INDEX retailer_name_idx ON retailer_policies(name)`;
    console.log('✓ retailer_policies table created\n');

    // Create return_items table
    console.log('Creating return_items table...');
    await sql`
      CREATE TABLE return_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        retailer_id UUID NOT NULL REFERENCES retailer_policies(id) ON DELETE CASCADE,
        name TEXT,
        price DECIMAL(10, 2),
        original_currency TEXT DEFAULT 'USD' NOT NULL,
        price_usd DECIMAL(10, 2),
        currency_symbol TEXT DEFAULT '$' NOT NULL,
        purchase_date TIMESTAMP NOT NULL,
        return_deadline TIMESTAMP NOT NULL,
        is_returned BOOLEAN DEFAULT FALSE NOT NULL,
        is_kept BOOLEAN DEFAULT FALSE NOT NULL,
        returned_date TIMESTAMP,
        kept_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `;
    await sql`CREATE INDEX return_items_user_id_idx ON return_items(user_id)`;
    await sql`CREATE INDEX return_items_retailer_id_idx ON return_items(retailer_id)`;
    await sql`CREATE INDEX return_deadline_idx ON return_items(return_deadline)`;
    await sql`CREATE INDEX is_returned_idx ON return_items(is_returned)`;
    console.log('✓ return_items table created\n');

    // Create user_settings table
    console.log('Creating user_settings table...');
    await sql`
      CREATE TABLE user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        preferred_currency TEXT DEFAULT 'USD' NOT NULL,
        notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        email_notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        push_notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    await sql`CREATE INDEX settings_user_id_idx ON user_settings(user_id)`;
    console.log('✓ user_settings table created\n');

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
