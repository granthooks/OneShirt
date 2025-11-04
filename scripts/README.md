# OneShirt Scripts

This directory contains utility scripts for the OneShirt application, including database migrations and data management.

## apply-migration.js

A helper script for applying database migrations to Supabase.

### Usage

Run the migration helper:
```bash
npm run migrate
```

This will:
1. Check that the migration file exists
2. Load and validate your Supabase configuration
3. Test the connection to Supabase
4. Provide step-by-step instructions for applying the migration via the Supabase Dashboard

### View Full SQL

To see the complete migration SQL:
```bash
npm run migrate:show
```

Or manually:
```bash
node scripts/apply-migration.js --show-sql
```

### Why Not Apply Automatically?

The Supabase JavaScript client does not support executing raw SQL for security reasons. This prevents potential SQL injection attacks and ensures migrations are reviewed before execution.

Instead, you must:
1. Copy the migration SQL from `supabase/migrations/20250103_initial_schema.sql`
2. Open the Supabase Dashboard SQL Editor
3. Paste and execute the SQL

The script makes this process easier by:
- Validating your setup
- Testing your connection
- Providing clear instructions
- Showing SQL previews

### Migration File

Location: `C:\gkh\documents\Projects\OneShirt\app\supabase\migrations\20250103_initial_schema.sql`

This migration creates:
- Tables: `users`, `shirts`, `bids`
- Functions: `place_bid()`, `get_shirt_stats()`, `get_user_stats()`
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for automatic timestamps

### Safety Features

The migration is **idempotent** - it can be run multiple times safely:
- Uses `IF NOT EXISTS` clauses
- Uses `CREATE OR REPLACE` for functions
- Won't error if tables/functions already exist

### Environment Variables

Required in `.env.local`:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## upload-shirts-to-storage.js

A script that uploads shirt design images to Supabase Storage and updates the database with the new URLs.

### Usage

Run the upload script:
```bash
npm run upload-shirts
```

Or directly:
```bash
node scripts/upload-shirts-to-storage.js
```

### What It Does

1. **Creates Storage Bucket**: Creates a public "shirt-images" bucket in Supabase Storage (if it doesn't exist)
2. **Uploads Images**: Uploads all .webp files from the `shirt_designs/` directory
3. **Creates Database Records**: For each shirt with:
   - Creative names (Cosmic Dreams, Retro Wave, Neon Nights, etc.)
   - Public Supabase Storage URLs
   - Bid threshold of 250
   - Active status
4. **Cleanup**: Deletes old placeholder shirts that use picsum.photos URLs

### Requirements

- `.env.local` file with Supabase credentials:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Shirt design images in `shirt_designs/` directory (*.webp format)
- Database tables already created (run migration first if needed)

### Output Example

```
======================================================================
OneShirt Image Upload to Supabase Storage
======================================================================

Step 1: Loading Supabase configuration...
✓ Supabase client initialized

Step 2: Checking storage bucket...
✓ Bucket "shirt-images" already exists

Step 3: Reading shirt design files...
✓ Found 7 .webp files in shirt_designs/

Step 4: Uploading images and creating database records...

[1/7] Processing: original-1761576585-05f41c98c6beae7fd33dcb9a5ccd7285.webp
  - Read file (245.67 KB)
  ✓ Uploaded to storage
  ✓ Public URL: https://your-project.supabase.co/storage/v1/object/public/...
  ✓ Created shirt record: "Cosmic Dreams" (ID: abc-123)

...

Step 5: Cleaning up old placeholder images...
✓ Deleted 3 placeholder shirt(s)

======================================================================
Upload Summary
======================================================================

Total files processed: 7
Successfully uploaded: 7
Failed: 0

Uploaded shirts:
  1. Cosmic Dreams (250 bids to win)
  2. Retro Wave (250 bids to win)
  ...

✓ Upload complete! Your shirts are now live on Supabase Storage.
```

### Safety Features

- **Idempotent**: Uses `upsert: true` so re-running is safe
- **Error Handling**: Continues processing other files if one fails
- **Detailed Logging**: Shows progress and any errors clearly
- **Validation**: Checks for environment variables and file existence

### Troubleshooting

- **Bucket exists error**: Script will use existing bucket automatically
- **Upload failures**: Check Supabase storage quota and permissions
- **Database insert failures**: Ensure shirts table exists (run migration first)
- **No files found**: Verify .webp files exist in `shirt_designs/` directory

## Future Scripts

Additional utility scripts will be added here as needed.
