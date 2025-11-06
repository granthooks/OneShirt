/**
 * Test script for Bright Data API with Threadless URLs
 *
 * This script:
 * 1. Tests connection to Bright Data API
 * 2. Fetches a Threadless search page
 * 3. Logs the HTML structure for analysis
 * 4. Tests different zone names if needed
 *
 * Run with: npx tsx scraper/test-brightdata.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });

import { fetchUrlWithBrightData, testBrightDataService } from './services/brightDataService';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Threadless URLs to test
const THREADLESS_URLS = {
  mens: 'https://www.threadless.com/search/?sort=popular&departments=mens&style=t-shirt&type=regular',
  womens: 'https://www.threadless.com/search/?sort=popular&departments=womens&style=t-shirt&type=fitted',
  simple: 'https://www.threadless.com/',
};

async function main() {
  console.log('='.repeat(80));
  console.log('BRIGHT DATA API TEST');
  console.log('='.repeat(80));
  console.log('');

  // Test 0: Try different zone names to find the right one
  console.log('Test 0: Finding Correct Zone Name');
  console.log('-'.repeat(80));
  const zonesToTry = [
    'residential_proxy1',
    'unlocker',
    'web_unlocker',
    'web_unlocker1',
    'unlocker_residential',
    'scraping_browser',
  ];

  let workingZone: string | null = null;
  for (const zone of zonesToTry) {
    console.log(`Trying zone: ${zone}...`);
    const result = await fetchUrlWithBrightData('https://example.com', { zone, timeout: 30000 });
    if (!result.error && result.content.length > 0) {
      console.log(`✓ SUCCESS! Zone "${zone}" works!`);
      workingZone = zone;
      // Update env var for subsequent tests
      process.env.BRIGHT_DATA_ZONE = zone;
      break;
    } else {
      console.log(`  ✗ Failed: ${result.error || 'Empty content'}`);
    }
  }

  if (!workingZone) {
    console.error('\n❌ Could not find a working zone name.');
    console.error('Please check your Bright Data dashboard for the correct zone name.');
    console.error('Common locations:');
    console.error('  - Bright Data Dashboard > Proxies & Scraping Infrastructure > Zones');
    console.error('  - Look for "Web Unlocker" or similar zone type');
    process.exit(1);
  }

  console.log(`\n✓ Using zone: ${workingZone}`);
  console.log('');

  // Test 2: Fetch Threadless homepage
  console.log('Test 2: Fetch Threadless Homepage');
  console.log('-'.repeat(80));
  const homepageResult = await fetchUrlWithBrightData(THREADLESS_URLS.simple);
  if (homepageResult.error) {
    console.error('Homepage fetch failed:', homepageResult.error);
  } else {
    console.log(`✓ Successfully fetched homepage (${homepageResult.content.length} chars)`);
    // Save to file for inspection
    const filepath = join(__dirname, 'test-output-homepage.html');
    writeFileSync(filepath, homepageResult.content);
    console.log(`✓ Saved HTML to: ${filepath}`);
    console.log(`✓ First 500 chars:\n${homepageResult.content.substring(0, 500)}`);
  }
  console.log('');

  // Test 3: Fetch Threadless men's search page
  console.log('Test 3: Fetch Threadless Mens Search Page');
  console.log('-'.repeat(80));
  const mensResult = await fetchUrlWithBrightData(THREADLESS_URLS.mens);
  if (mensResult.error) {
    console.error('Mens search fetch failed:', mensResult.error);
  } else {
    console.log(`✓ Successfully fetched mens search (${mensResult.content.length} chars)`);
    // Save to file for inspection
    const filepath = join(__dirname, 'test-output-mens-search.html');
    writeFileSync(filepath, mensResult.content);
    console.log(`✓ Saved HTML to: ${filepath}`);

    // Try to find product links in the HTML
    const productLinkRegex = /href="([^"]*\/shop\/[^"]+)"/g;
    const matches = [...mensResult.content.matchAll(productLinkRegex)];
    console.log(`✓ Found ${matches.length} potential product links`);
    if (matches.length > 0) {
      console.log('  Sample links:');
      matches.slice(0, 5).forEach((match, i) => {
        console.log(`  ${i + 1}. ${match[1]}`);
      });
    }

    // Look for product images
    const imageRegex = /src="([^"]*threadless[^"]*\.jpg[^"]*)"/gi;
    const imageMatches = [...mensResult.content.matchAll(imageRegex)];
    console.log(`✓ Found ${imageMatches.length} potential product images`);
    if (imageMatches.length > 0) {
      console.log('  Sample images:');
      imageMatches.slice(0, 3).forEach((match, i) => {
        console.log(`  ${i + 1}. ${match[1]}`);
      });
    }
  }
  console.log('');

  // Test 4: If we found a product link, fetch a product page
  if (mensResult.content && !mensResult.error) {
    const productLinkRegex = /href="([^"]*\/shop\/[^"]+)"/;
    const match = mensResult.content.match(productLinkRegex);

    if (match && match[1]) {
      let productUrl = match[1];
      // Make sure it's a full URL
      if (productUrl.startsWith('/')) {
        productUrl = 'https://www.threadless.com' + productUrl;
      }

      console.log('Test 4: Fetch Product Page');
      console.log('-'.repeat(80));
      console.log(`Fetching: ${productUrl}`);

      const productResult = await fetchUrlWithBrightData(productUrl);
      if (productResult.error) {
        console.error('Product fetch failed:', productResult.error);
      } else {
        console.log(`✓ Successfully fetched product page (${productResult.content.length} chars)`);
        // Save to file for inspection
        const filepath = join(__dirname, 'test-output-product.html');
        writeFileSync(filepath, productResult.content);
        console.log(`✓ Saved HTML to: ${filepath}`);

        // Look for key data points
        const titleMatch = productResult.content.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const priceMatch = productResult.content.match(/\$\d+\.?\d*/);
        const designerMatch = productResult.content.match(/by ([^<]+)/i);

        console.log('Product Data Found:');
        console.log(`  Title: ${titleMatch ? titleMatch[1] : 'NOT FOUND'}`);
        console.log(`  Price: ${priceMatch ? priceMatch[0] : 'NOT FOUND'}`);
        console.log(`  Designer: ${designerMatch ? designerMatch[1] : 'NOT FOUND'}`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the saved HTML files in scraper/test-output-*.html');
  console.log('2. Analyze the HTML structure to build the parser');
  console.log('3. Implement htmlParser.ts based on findings');
}

main().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
