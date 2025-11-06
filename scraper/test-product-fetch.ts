/**
 * Test script to fetch a specific Threadless product page for analysis
 *
 * Run with: npx tsx scraper/test-product-fetch.ts [URL]
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });

import { fetchUrlWithBrightData } from './services/brightDataService';

// Sample Threadless product URLs to try
const SAMPLE_PRODUCT_URLS = [
  'https://www.threadless.com/shop/space-cat/mens',
  'https://www.threadless.com/shop/cat-astronaut/mens',
  'https://www.threadless.com/shop/galaxy-cat/mens',
];

async function main() {
  // Get URL from command line or use first sample
  const targetUrl = process.argv[2] || SAMPLE_PRODUCT_URLS[0];

  console.log('='.repeat(80));
  console.log('THREADLESS PRODUCT PAGE FETCH TEST');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Target URL: ${targetUrl}`);
  console.log('');

  // Ensure output directory exists
  const outputDir = join(__dirname, 'test-output');
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }

  console.log('Fetching product page...');
  const result = await fetchUrlWithBrightData(targetUrl, {
    zone: 'residential_proxy1',
    timeout: 60000
  });

  if (result.error) {
    console.error('❌ Fetch failed:', result.error);
    process.exit(1);
  }

  console.log(`✓ Successfully fetched (${result.content.length} chars)`);

  // Check if it's a 404
  if (result.content.includes('Error - Page Not Found') || result.content.includes('<title>404')) {
    console.error('❌ This appears to be a 404 page. Please try a different URL.');
    console.log('');
    console.log('Try one of these sample URLs:');
    SAMPLE_PRODUCT_URLS.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    console.log('');
    console.log('Or find a product on https://www.threadless.com and copy the URL');
    process.exit(1);
  }

  // Save to file
  const filepath = join(outputDir, 'product-page.html');
  writeFileSync(filepath, result.content);
  console.log(`✓ Saved HTML to: ${filepath}`);
  console.log('');

  // Quick analysis
  console.log('Quick Analysis:');
  console.log('-'.repeat(80));

  // Look for title
  const titlePatterns = [
    /<h1[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*>([^<]+)<\/h1>/,
    /<meta\s+property="og:title"\s+content="([^"]+)"/i,
  ];

  for (const pattern of titlePatterns) {
    const match = result.content.match(pattern);
    if (match && !match[1].includes('404') && !match[1].includes('Error')) {
      console.log(`Title found: "${match[1].trim()}"`);
      break;
    }
  }

  // Look for price
  const pricePatterns = [
    /"price":\s*"?\$?(\d+\.?\d*)?"?/,
    /\$(\d+\.?\d*)/,
    /data-price="(\d+\.?\d*)"/,
    /<span[^>]*class="[^"]*price[^"]*"[^>]*>\$(\d+\.?\d*)<\/span>/i,
  ];

  for (const pattern of pricePatterns) {
    const match = result.content.match(pattern);
    if (match) {
      console.log(`Price found: $${match[1]}`);
      break;
    }
  }

  // Look for designer/artist
  const designerPatterns = [
    /by\s+<[^>]+>([^<]+)<\/[^>]+>/i,
    /"artist":\s*"([^"]+)"/i,
    /"artistName":\s*"([^"]+)"/i,
    /artist[^>]*>([^<]+)</i,
    /designer[^>]*>([^<]+)</i,
  ];

  for (const pattern of designerPatterns) {
    const match = result.content.match(pattern);
    if (match && !match[1].toLowerCase().includes('sell')) {
      console.log(`Designer found: "${match[1].trim()}"`);
      break;
    }
  }

  // Look for images
  const imagePatterns = [
    /src="([^"]*threadless[^"]*\/products\/[^"]*\.(?:jpg|png)[^"]*)"/gi,
    /data-src="([^"]*threadless[^"]*\/products\/[^"]*\.(?:jpg|png)[^"]*)"/gi,
  ];

  const allImages = new Set<string>();
  for (const pattern of imagePatterns) {
    const matches = [...result.content.matchAll(pattern)];
    matches.forEach(m => {
      // Decode HTML entities
      const url = m[1].replace(/&amp;/g, '&');
      allImages.add(url);
    });
  }

  console.log(`Images found: ${allImages.size}`);
  if (allImages.size > 0) {
    console.log('Sample images:');
    Array.from(allImages).slice(0, 3).forEach((img, i) => {
      console.log(`  ${i + 1}. ${img.substring(0, 100)}...`);
    });
  }

  // Look for JSON-LD or structured data
  const jsonLdMatch = result.content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    console.log('\n✓ Found JSON-LD structured data');
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      console.log('Structured data type:', data['@type']);
      if (data.name) console.log('  Name:', data.name);
      if (data.offers?.price) console.log('  Price:', data.offers.price);
      if (data.brand?.name) console.log('  Brand:', data.brand.name);

      // Save JSON
      const jsonPath = join(outputDir, 'product-jsonld.json');
      writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      console.log(`✓ Saved JSON-LD to: ${jsonPath}`);
    } catch (e) {
      console.log('  (Could not parse)');
    }
  }

  // Look for React/Next.js data
  const nextDataMatch = result.content.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    console.log('\n✓ Found Next.js data (this is likely where product data lives!)');
    try {
      const data = JSON.parse(nextDataMatch[1]);

      // Save JSON
      const jsonPath = join(outputDir, 'product-next-data.json');
      writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      console.log(`✓ Saved Next.js data to: ${jsonPath}`);

      // Try to find product data in the structure
      if (data.props?.pageProps) {
        console.log('Page props keys:', Object.keys(data.props.pageProps));
      }
    } catch (e) {
      console.log('  (Could not parse)', e);
    }
  }

  // Look for window.__INITIAL_STATE__ or similar
  const initialStateMatch = result.content.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/);
  if (initialStateMatch) {
    console.log('\n✓ Found __INITIAL_STATE__ data');
    try {
      const data = JSON.parse(initialStateMatch[1]);
      const jsonPath = join(outputDir, 'product-initial-state.json');
      writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      console.log(`✓ Saved initial state to: ${jsonPath}`);
    } catch (e) {
      console.log('  (Could not parse)');
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Next steps:');
  console.log('1. Open the HTML file to examine the structure');
  console.log('2. If JSON data found, examine that for easier parsing');
  console.log('3. Implement htmlParser.ts based on findings');
  console.log('');
  console.log('To test another URL:');
  console.log('  npx tsx scraper/test-product-fetch.ts <URL>');
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
