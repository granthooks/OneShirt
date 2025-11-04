/**
 * OneShirt Image Upload Script
 *
 * This script uploads shirt design images to Supabase Storage and updates
 * the database with the new URLs, replacing placeholder images.
 *
 * Usage:
 *   npm run upload-shirts
 *   or
 *   node scripts/upload-shirts-to-storage.js
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

/**
 * Generate creative shirt names based on filename index
 */
function generateShirtName(filename, index) {
  const creativeNames = [
    'Cosmic Dreams',
    'Retro Wave',
    'Neon Nights',
    'Urban Legend',
    'Digital Sunrise',
    'Abstract Vibes',
    'Chromatic Fusion'
  ];

  return creativeNames[index] || `Design ${index + 1}`;
}

/**
 * Load environment variables from .env.local
 */
function loadEnvVars() {
  const envPath = path.join(__dirname, '..', '.env.local');

  if (!fs.existsSync(envPath)) {
    log('ERROR: .env.local file not found', colors.red);
    log('Please ensure you have your Supabase credentials configured.', colors.red);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
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

  return { supabaseUrl, supabaseKey };
}

/**
 * Main upload function
 */
async function uploadShirts() {
  header('OneShirt Image Upload to Supabase Storage');

  // Step 1: Load environment and create Supabase client
  log('Step 1: Loading Supabase configuration...', colors.blue);
  const { supabaseUrl, supabaseKey } = loadEnvVars();
  const supabase = createClient(supabaseUrl, supabaseKey);
  log('✓ Supabase client initialized', colors.green);

  // Step 2: Assume bucket exists (must be created manually)
  log('\nStep 2: Checking storage bucket...', colors.blue);
  log('Assuming "shirt-images" bucket exists (must be created manually in Supabase Dashboard)', colors.blue);
  log('If upload fails, create the bucket at: Storage > New Bucket', colors.yellow);
  log('Bucket settings: Public = true, File size limit = 5MB, Allowed types = image/webp, image/jpeg, image/png', colors.yellow);
  log('✓ Proceeding with upload...', colors.green);

  // Step 3: Read and upload images
  log('\nStep 3: Reading shirt design files...', colors.blue);
  const designsDir = path.join(__dirname, '..', 'shirt_designs');

  if (!fs.existsSync(designsDir)) {
    log(`ERROR: Designs directory not found: ${designsDir}`, colors.red);
    process.exit(1);
  }

  let files;
  try {
    files = fs.readdirSync(designsDir).filter(f => f.endsWith('.webp'));
    log(`✓ Found ${files.length} .webp files in shirt_designs/`, colors.green);
  } catch (error) {
    log(`ERROR: Could not read designs directory: ${error.message}`, colors.red);
    throw error;
  }

  if (files.length === 0) {
    log('WARNING: No .webp files found in shirt_designs/', colors.yellow);
    process.exit(0);
  }

  // Step 4: Upload each image and create database record
  log('\nStep 4: Uploading images and creating database records...', colors.blue);
  const uploadedShirts = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(designsDir, file);

    try {
      log(`\n[${i + 1}/${files.length}] Processing: ${file}`, colors.cyan);

      // Read file
      const fileBuffer = fs.readFileSync(filePath);
      log(`  - Read file (${(fileBuffer.length / 1024).toFixed(2)} KB)`, colors.blue);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shirt-images')
        .upload(file, fileBuffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) {
        log(`  ERROR uploading ${file}: ${uploadError.message}`, colors.red);
        continue;
      }

      log(`  ✓ Uploaded to storage: ${uploadData.path}`, colors.green);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('shirt-images')
        .getPublicUrl(file);

      const publicUrl = urlData.publicUrl;
      log(`  ✓ Public URL: ${publicUrl}`, colors.green);

      // Generate shirt name
      const shirtName = generateShirtName(file, i);

      // Create shirt record
      const { data: shirtData, error: insertError } = await supabase
        .from('shirts')
        .insert({
          name: shirtName,
          image_url: publicUrl,
          bid_threshold: 250,
          current_bid_count: 0,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        log(`  ERROR creating database record: ${insertError.message}`, colors.red);
        continue;
      }

      log(`  ✓ Created shirt record: "${shirtName}" (ID: ${shirtData.id})`, colors.green);
      uploadedShirts.push(shirtData);

    } catch (error) {
      log(`  ERROR processing ${file}: ${error.message}`, colors.red);
      continue;
    }
  }

  // Step 5: Clean up old placeholder images
  log('\nStep 5: Cleaning up old placeholder images...', colors.blue);
  try {
    const { data: deletedShirts, error: deleteError } = await supabase
      .from('shirts')
      .delete()
      .like('image_url', '%picsum.photos%')
      .select();

    if (deleteError) {
      log(`ERROR: Could not delete placeholder shirts: ${deleteError.message}`, colors.red);
    } else {
      const deletedCount = deletedShirts?.length || 0;
      log(`✓ Deleted ${deletedCount} placeholder shirt(s)`, colors.green);
    }
  } catch (error) {
    log(`ERROR in cleanup: ${error.message}`, colors.red);
  }

  // Final summary
  header('Upload Summary');
  log(`Total files processed: ${files.length}`, colors.bright);
  log(`Successfully uploaded: ${uploadedShirts.length}`, colors.green);
  log(`Failed: ${files.length - uploadedShirts.length}`, uploadedShirts.length < files.length ? colors.red : colors.green);

  if (uploadedShirts.length > 0) {
    log('\nUploaded shirts:', colors.bright);
    uploadedShirts.forEach((shirt, idx) => {
      log(`  ${idx + 1}. ${shirt.name} (${shirt.bid_threshold} bids to win)`, colors.cyan);
    });
  }

  log('\n✓ Upload complete! Your shirts are now live on Supabase Storage.', colors.bright + colors.green);
}

// Run the script
uploadShirts().catch(err => {
  console.error(colors.red + '\nFATAL ERROR: ' + err.message + colors.reset);
  console.error(err);
  process.exit(1);
});
