const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set in your environment or .env.local file.");
    console.log("👉 Please run the SQL migration manually in your Supabase SQL Editor:");
    console.log(path.join(__dirname, '40-add-campaign-scheduling.sql'));
    process.exit(1);
  }

  console.log("🔌 Connecting to PostgreSQL database...");
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("✅ Connected. Running migration...");
    
    const sql = fs.readFileSync(path.join(__dirname, '40-add-campaign-scheduling.sql'), 'utf8');
    await client.query(sql);
    
    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
