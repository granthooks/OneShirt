/**
 * Supabase Service for Scraper
 *
 * Handles:
 * - Uploading product images to Supabase Storage
 * - Inserting scraped product data into the database
 * - Checking for duplicate products
 * - Processing batches of scraped products
 *
 * Note: This uses Node.js environment variables (process.env) instead of Vite's import.meta.env
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ScrapedShirt } from '../types';
import type { Database } from '../../services/supabaseClient';

/**
 * Results from processing scraped shirts
 */
export interface ScrapeResults {
  /** Total number of shirts processed */
  total: number;

  /** Number successfully inserted */
  success: number;

  /** Number that failed */
  failed: number;

  /** Number skipped (duplicates) */
  skipped: number;

  /** Array of error messages */
  errors: string[];
}

// Initialize Supabase client for scraper (using Node.js env vars)
let supabaseClient: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
    );
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
  return supabaseClient;
}

/**
 * Uploads an image to Supabase Storage from a URL
 *
 * @param imageUrl - The URL of the image to download and upload
 * @param filename - Optional custom filename (will be auto-generated if not provided)
 * @returns Promise<string> - The public URL of the uploaded image
 * @throws Error if upload fails
 */
export async function uploadImageToStorage(
  imageUrl: string,
  filename?: string
): Promise<string> {
  try {
    console.log(`[Supabase Service] Downloading image: ${imageUrl.substring(0, 80)}...`);

    // Fetch the image as ArrayBuffer
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);

    // Generate filename if not provided
    if (!filename) {
      // Extract extension from URL or content-type
      const contentType = response.headers.get('content-type');
      let extension = 'jpg'; // default

      if (contentType?.includes('png')) {
        extension = 'png';
      } else if (contentType?.includes('webp')) {
        extension = 'webp';
      } else if (imageUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i)) {
        const match = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i);
        extension = match![1].toLowerCase();
      }

      // Generate unique filename with timestamp
      filename = `scraped-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    }

    console.log(`[Supabase Service] Uploading as: ${filename}`);

    // Upload to Supabase Storage
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from('shirt-images')
      .upload(filename, imageBlob, {
        contentType: response.headers.get('content-type') || 'image/jpeg',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('shirt-images')
      .getPublicUrl(data.path);

    console.log(`[Supabase Service] ✓ Image uploaded successfully`);
    return publicUrlData.publicUrl;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Supabase Service] ✗ Image upload failed:`, errorMessage);
    throw new Error(`Failed to upload image: ${errorMessage}`);
  }
}

/**
 * Checks if a shirt already exists in the database
 *
 * @param name - The shirt name
 * @param designer - The designer name
 * @returns Promise<boolean> - true if exists, false otherwise
 */
async function shirtExists(name: string, designer: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('shirts')
      .select('id')
      .eq('name', name)
      .eq('designer', designer)
      .limit(1);

    if (error) {
      console.error(`[Supabase Service] Error checking for duplicate:`, error.message);
      return false; // If we can't check, assume it doesn't exist
    }

    return data && data.length > 0;
  } catch (error) {
    console.error(`[Supabase Service] Error in shirtExists:`, error);
    return false;
  }
}

/**
 * Inserts a shirt into the database
 *
 * @param shirt - The scraped shirt data
 * @param imageStorageUrl - The public URL of the uploaded image
 * @returns Promise<boolean> - true if successful, false if skipped (duplicate) or failed
 */
export async function insertShirtIntoDatabase(
  shirt: ScrapedShirt,
  imageStorageUrl: string
): Promise<boolean> {
  try {
    console.log(`[Supabase Service] Checking for duplicate: "${shirt.title}"`);

    // Check if shirt already exists
    const exists = await shirtExists(shirt.title, shirt.designerName);
    if (exists) {
      console.log(`[Supabase Service] ⊘ Skipped (duplicate): "${shirt.title}"`);
      return false;
    }

    console.log(`[Supabase Service] Inserting: "${shirt.title}"`);

    // Insert the shirt
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('shirts')
      .insert({
        name: shirt.title,
        designer: shirt.designerName,
        image_url: imageStorageUrl,
        status: 'active',
        current_bid_count: 0,
        bid_threshold: 100, // Default threshold
        like_count: 0
      });

    if (error) {
      throw new Error(`Database insert error: ${error.message}`);
    }

    console.log(`[Supabase Service] ✓ Successfully inserted: "${shirt.title}"`);
    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Supabase Service] ✗ Failed to insert "${shirt.title}":`, errorMessage);
    throw error;
  }
}

/**
 * Processes an array of scraped shirts: uploads images and inserts into database
 *
 * @param shirts - Array of scraped shirt data
 * @returns Promise<ScrapeResults> - Summary of processing results
 */
export async function processShirts(shirts: ScrapedShirt[]): Promise<ScrapeResults> {
  console.log('');
  console.log('='.repeat(80));
  console.log(`PROCESSING ${shirts.length} SCRAPED SHIRTS`);
  console.log('='.repeat(80));
  console.log('');

  const results: ScrapeResults = {
    total: shirts.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < shirts.length; i++) {
    const shirt = shirts[i];
    console.log(`[${i + 1}/${shirts.length}] Processing: "${shirt.title}" by ${shirt.designerName}`);

    try {
      // Step 1: Upload image to storage
      const imageStorageUrl = await uploadImageToStorage(shirt.imageUrl);

      // Step 2: Insert into database
      const inserted = await insertShirtIntoDatabase(shirt, imageStorageUrl);

      if (inserted) {
        results.success++;
      } else {
        results.skipped++;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Supabase Service] ✗ Error processing "${shirt.title}":`, errorMessage);
      results.failed++;
      results.errors.push(`${shirt.title}: ${errorMessage}`);
    }

    console.log('');
  }

  // Print summary
  console.log('='.repeat(80));
  console.log('PROCESSING COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total:    ${results.total}`);
  console.log(`Success:  ${results.success}`);
  console.log(`Skipped:  ${results.skipped} (duplicates)`);
  console.log(`Failed:   ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('='.repeat(80));
  console.log('');

  return results;
}
