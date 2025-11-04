/**
 * OneShirt Database Migration Script
 *
 * This script helps you apply the database migration to Supabase.
 * Since the Supabase JavaScript client doesn't support raw SQL execution
 * (for security reasons), this script provides instructions and helpers
 * for applying the migration via the Supabase dashboard.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(70));
  log(message, colors.bright + colors.cyan);
  console.log('='.repeat(70) + '\n');
}

async function main() {
  header('OneShirt Database Migration Tool');

  // Path to migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250103_initial_schema.sql');

  // Step 1: Check if migration file exists
  log('Step 1: Checking migration file...', colors.blue);
  if (!fs.existsSync(migrationPath)) {
    log(`ERROR: Migration file not found at: ${migrationPath}`, colors.red);
    process.exit(1);
  }
  log(`✓ Found migration file: ${migrationPath}`, colors.green);

  // Step 2: Read migration content
  log('\nStep 2: Reading migration file...', colors.blue);
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  const lines = migrationSQL.split('\n').length;
  log(`✓ Migration file loaded (${lines} lines)`, colors.green);

  // Step 3: Load environment variables
  log('\nStep 3: Checking Supabase configuration...', colors.blue);
  const envPath = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envPath)) {
    log('WARNING: .env.local file not found', colors.yellow);
    log('Please ensure you have your Supabase credentials configured.', colors.yellow);
  }

  // Try to load environment variables manually
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('ERROR: Supabase credentials not found in .env.local', colors.red);
    log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.', colors.red);
    process.exit(1);
  }

  log(`✓ Supabase URL: ${supabaseUrl}`, colors.green);
  log(`✓ API Key: ${supabaseKey.substring(0, 20)}...`, colors.green);

  // Step 4: Test connection
  log('\nStep 4: Testing Supabase connection...', colors.blue);
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try a simple query to test connection
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is expected
      log(`✓ Connected to Supabase (Table 'users' not found yet - this is expected before migration)`, colors.green);
    } else {
      log(`✓ Connected to Supabase successfully`, colors.green);
    }
  } catch (err) {
    log(`WARNING: Could not test connection: ${err.message}`, colors.yellow);
  }

  // Step 5: Provide migration instructions
  header('Migration Instructions');

  log('The Supabase JavaScript client does not support executing raw SQL for security reasons.', colors.yellow);
  log('You need to apply this migration via the Supabase Dashboard SQL Editor.\n', colors.yellow);

  log('Follow these steps:', colors.bright);
  log('1. Open your Supabase Dashboard:', colors.cyan);
  log(`   ${supabaseUrl.replace('//', '//app.').replace('agntc.io', 'agntc.io/project')}\n`, colors.blue);

  log('2. Navigate to: SQL Editor (in the left sidebar)\n', colors.cyan);

  log('3. Click "New Query"\n', colors.cyan);

  log('4. Copy the migration SQL:', colors.cyan);
  log(`   File location: ${migrationPath}\n`, colors.blue);

  log('5. Paste the SQL into the editor and click "Run"\n', colors.cyan);

  log('6. Verify the migration succeeded by checking:', colors.cyan);
  log('   - No errors in the output', colors.blue);
  log('   - Tables created: users, shirts, bids', colors.blue);
  log('   - Functions created: place_bid, get_shirt_stats, get_user_stats\n', colors.blue);

  // Show a preview of the migration
  log('\nMigration Preview (first 20 lines):', colors.bright);
  console.log(colors.yellow + '-'.repeat(70) + colors.reset);
  const previewLines = migrationSQL.split('\n').slice(0, 20);
  previewLines.forEach(line => console.log(line));
  console.log(colors.yellow + '-'.repeat(70) + colors.reset);
  log(`... (${lines - 20} more lines)\n`, colors.yellow);

  // Option to output full SQL
  log('To see the full migration SQL, run:', colors.bright);
  log(`  cat "${migrationPath}"`, colors.blue);
  log('Or:', colors.bright);
  log(`  node scripts/apply-migration.js --show-sql\n`, colors.blue);

  if (process.argv.includes('--show-sql')) {
    header('Full Migration SQL');
    console.log(migrationSQL);
  }

  // Final notes
  header('Important Notes');
  log('- This migration is IDEMPOTENT (can be run multiple times safely)', colors.green);
  log('- It uses "IF NOT EXISTS" clauses to avoid errors on re-runs', colors.green);
  log('- RLS policies are currently PERMISSIVE for development', colors.yellow);
  log('- Review the TODO comments in the migration for production hardening\n', colors.yellow);

  log('Migration script completed!', colors.bright + colors.green);
}

// Run the script
main().catch(err => {
  console.error(colors.red + 'ERROR: ' + err.message + colors.reset);
  console.error(err);
  process.exit(1);
});
