/**
 * Service for scraping Threadless.com product pages
 *
 * This service uses Bright Data Web Unlocker to fetch product pages
 * and the HTML parser to extract product data.
 *
 * NEW APPROACH: User provides a list of product URLs, and we scrape each one individually.
 */

import { fetchUrlWithBrightData } from './brightDataService';
import { parseThreadlessProductPage } from './htmlParser';
import type { ScrapedShirt } from '../types';

/**
 * Validates if a URL is a valid Threadless product page
 * @param url - The URL to validate
 * @returns true if valid, false otherwise
 */
export function isValidThreadlessProductUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === 'www.threadless.com' &&
      urlObj.pathname.includes('/shop/')
    );
  } catch {
    return false;
  }
}

/**
 * Scrapes a single Threadless product URL
 *
 * @param url - The Threadless product URL to scrape
 * @returns Promise<ScrapedShirt | null> - The scraped product data, or null if failed
 */
export async function scrapeProductUrl(url: string): Promise<ScrapedShirt | null> {
  try {
    console.log(`[Threadless Service] Scraping: ${url}`);

    // Validate URL
    if (!isValidThreadlessProductUrl(url)) {
      console.error(`[Threadless Service] Invalid Threadless URL: ${url}`);
      return null;
    }

    // Fetch the HTML using Bright Data
    const response = await fetchUrlWithBrightData(url, {
      zone: 'residential_proxy1',
      timeout: 60000
    });

    if (response.error || !response.content) {
      console.error(`[Threadless Service] Failed to fetch ${url}: ${response.error}`);
      return null;
    }

    // Parse the HTML
    const product = parseThreadlessProductPage(response.content, url);

    if (!product) {
      console.error(`[Threadless Service] Failed to parse product from ${url}`);
      return null;
    }

    console.log(`[Threadless Service] Successfully scraped: "${product.title}"`);
    return product;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Threadless Service] Error scraping ${url}:`, errorMessage);
    return null;
  }
}

/**
 * Scrapes multiple Threadless product URLs sequentially with delay
 *
 * @param urls - Array of Threadless product URLs to scrape
 * @param delayMs - Delay between requests in milliseconds (default: 2000)
 * @returns Promise<ScrapedShirt[]> - Array of successfully scraped products
 */
export async function scrapeMultipleUrls(
  urls: string[],
  delayMs: number = 2000
): Promise<ScrapedShirt[]> {
  console.log(`[Threadless Service] Scraping ${urls.length} URLs...`);

  const results: ScrapedShirt[] = [];
  const errors: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    console.log(`[Threadless Service] Processing ${i + 1}/${urls.length}: ${url}`);

    try {
      const product = await scrapeProductUrl(url);

      if (product) {
        results.push(product);
        console.log(`[Threadless Service] ✓ Success: "${product.title}"`);
      } else {
        errors.push(`Failed to scrape: ${url}`);
        console.log(`[Threadless Service] ✗ Failed: ${url}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Error scraping ${url}: ${errorMessage}`);
      console.error(`[Threadless Service] ✗ Error: ${errorMessage}`);
    }

    // Add delay between requests (except after the last one)
    if (i < urls.length - 1) {
      console.log(`[Threadless Service] Waiting ${delayMs}ms before next request...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log('');
  console.log(`[Threadless Service] Scraping complete!`);
  console.log(`[Threadless Service] Success: ${results.length}/${urls.length}`);
  if (errors.length > 0) {
    console.log(`[Threadless Service] Errors:`);
    errors.forEach(err => console.log(`  - ${err}`));
  }

  return results;
}

/**
 * Delays execution for the specified number of milliseconds
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
