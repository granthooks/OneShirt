#!/usr/bin/env node
/**
 * Threadless Scraper CLI
 *
 * Usage:
 *   npx tsx scraper/scrape.ts URL1 URL2 URL3...
 *   npx tsx scraper/scrape.ts --file=urls.txt
 *
 * This script:
 * 1. Accepts Threadless product URLs from command line or a file
 * 2. Scrapes each URL to extract product data
 * 3. Uploads product images to Supabase Storage
 * 4. Inserts product data into the database
 * 5. Reports detailed progress and results
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { scrapeMultipleUrls, isValidThreadlessProductUrl } from './services/threadlessService';
import { processShirts } from './services/supabaseService';

/**
 * Reads URLs from a file (one URL per line)
 */
function readUrlsFromFile(filepath: string): string[] {
  try {
    const absolutePath = resolve(filepath);
    if (!existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const content = readFileSync(absolutePath, 'utf-8');
    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#')); // Filter empty lines and comments

    return urls;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to read URLs from file: ${errorMessage}`);
  }
}

/**
 * Parses command line arguments
 */
function parseArgs(): string[] {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: No URLs provided');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx scraper/scrape.ts URL1 URL2 URL3...');
    console.log('  npx tsx scraper/scrape.ts --file=urls.txt');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scraper/scrape.ts https://www.threadless.com/shop/@artist/design/design-name');
    process.exit(1);
  }

  // Check if --file argument is provided
  const fileArg = args.find(arg => arg.startsWith('--file='));
  if (fileArg) {
    const filepath = fileArg.substring('--file='.length);
    return readUrlsFromFile(filepath);
  }

  // Otherwise, treat all args as URLs
  return args;
}

/**
 * Validates URLs
 */
function validateUrls(urls: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  urls.forEach(url => {
    if (isValidThreadlessProductUrl(url)) {
      valid.push(url);
    } else {
      invalid.push(url);
    }
  });

  return { valid, invalid };
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(80));
  console.log('THREADLESS SCRAPER');
  console.log('='.repeat(80));
  console.log('');

  // Parse arguments
  let urls: string[];
  try {
    urls = parseArgs();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }

  console.log(`Found ${urls.length} URLs to process`);
  console.log('');

  // Validate URLs
  const { valid, invalid } = validateUrls(urls);

  if (invalid.length > 0) {
    console.log('WARNING: Invalid URLs found (will be skipped):');
    invalid.forEach(url => console.log(`  - ${url}`));
    console.log('');
  }

  if (valid.length === 0) {
    console.error('Error: No valid Threadless URLs found');
    process.exit(1);
  }

  console.log(`Processing ${valid.length} valid URLs...`);
  console.log('');

  // Step 1: Scrape product pages
  console.log('='.repeat(80));
  console.log('STEP 1: SCRAPING PRODUCT PAGES');
  console.log('='.repeat(80));
  console.log('');

  const scrapedShirts = await scrapeMultipleUrls(valid, 2000); // 2 second delay between requests

  if (scrapedShirts.length === 0) {
    console.error('Error: No products were successfully scraped');
    process.exit(1);
  }

  console.log('');
  console.log(`Successfully scraped ${scrapedShirts.length} products`);
  console.log('');

  // Step 2: Upload images and insert into database
  console.log('='.repeat(80));
  console.log('STEP 2: UPLOADING TO DATABASE');
  console.log('='.repeat(80));
  console.log('');

  const results = await processShirts(scrapedShirts);

  // Exit with appropriate code
  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
