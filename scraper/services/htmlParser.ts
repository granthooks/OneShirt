/**
 * HTML Parser for Threadless Product Pages
 *
 * This module parses Threadless product pages to extract:
 * - Product title
 * - Designer/artist name
 * - Product image URL
 * - Price
 * - Description
 * - Product ID/SKU
 *
 * Based on analysis of Threadless HTML structure:
 * - Title: h1.productPicker-title
 * - Designer: Extracted from URL (@username) or h2.productPicker-shop-name
 * - Image: meta[property="og:image"] or img.productHero-image
 * - Price: span.display-price.sale
 * - Description: meta[property="og:description"]
 * - Item number: Extracted from product image URL
 */

import * as cheerio from 'cheerio';
import type { ScrapedShirt } from '../types';

/**
 * Cleans and trims text content
 * @param text - The text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\n\r]+/g, ' ')
    .trim();
}

/**
 * Extracts the product ID from a Threadless image URL
 * Example: https://cdn-images.threadless.com/.../products/4016887/...
 * Returns: "4016887"
 */
function extractProductIdFromUrl(url: string): string | null {
  const match = url.match(/\/products\/(\d+)\//);
  return match ? match[1] : null;
}

/**
 * Extracts the designer/artist name from a Threadless URL
 * Example: /shop/@tobefonseca/design/... returns "tobefonseca"
 */
function extractDesignerFromUrl(url: string): string | null {
  const match = url.match(/\/@([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Parses a Threadless product page HTML and extracts product data
 *
 * @param html - The HTML content of the product page
 * @param productUrl - The URL of the product page (for reference)
 * @returns ScrapedShirt object if successful, null if critical fields are missing
 */
export function parseThreadlessProductPage(
  html: string,
  productUrl: string
): ScrapedShirt | null {
  try {
    const $ = cheerio.load(html);

    // Check if it's a 404 page
    const pageTitle = $('title').text();
    if (pageTitle.includes('404') || pageTitle.includes('Error - Page Not Found')) {
      console.error('[HTML Parser] This is a 404 page, skipping');
      return null;
    }

    // 1. Extract title
    // Priority: h1.productPicker-title > meta og:title > h1
    let title = cleanText($('h1.productPicker-title').first().text());
    if (!title) {
      title = cleanText($('meta[property="og:title"]').attr('content'));
    }
    if (!title) {
      title = cleanText($('h1').first().text());
    }

    if (!title || title.length === 0) {
      console.error('[HTML Parser] No title found');
      return null;
    }

    // Clean up title (remove " by Artist | Shop" suffix if present)
    title = title.replace(/\s+by\s+[^|]+\|[^|]+$/, '').trim();
    title = title.replace(/\s+T-Shirt$/, '').trim(); // Remove "T-Shirt" suffix

    // 2. Extract designer name
    // Priority: URL (@username) > h2.productPicker-shop-name
    let designerName = extractDesignerFromUrl(productUrl);
    if (!designerName) {
      const shopName = cleanText($('h2.productPicker-shop-name').first().text());
      // shopName format: "Retail Trends T-Shirt by tobefonseca"
      const match = shopName.match(/by\s+([^\s]+)/i);
      if (match) {
        designerName = match[1];
      }
    }

    if (!designerName || designerName.length === 0) {
      console.error('[HTML Parser] No designer name found');
      return null;
    }

    // 3. Extract image URL
    // Priority: meta og:image > img.productHero-image > first product image
    let imageUrl = $('meta[property="og:image"]').attr('content') || '';
    if (!imageUrl) {
      imageUrl = $('img.productHero-image').first().attr('src') || '';
    }
    if (!imageUrl) {
      imageUrl = $('img[src*="/products/"]').first().attr('src') || '';
    }

    // Decode HTML entities in image URL
    imageUrl = imageUrl.replace(/&amp;/g, '&');

    if (!imageUrl || imageUrl.length === 0) {
      console.error('[HTML Parser] No image URL found');
      return null;
    }

    // 4. Extract item number/SKU from image URL
    let itemNumber = extractProductIdFromUrl(imageUrl);
    if (!itemNumber) {
      // Fallback: try to extract from any product image
      const firstProductImg = $('img[src*="/products/"]').first().attr('src') || '';
      itemNumber = extractProductIdFromUrl(firstProductImg);
    }
    if (!itemNumber) {
      // Last fallback: use a hash of the URL
      itemNumber = `url-${Buffer.from(productUrl).toString('base64').substring(0, 12)}`;
    }

    // 5. Extract price (optional)
    let price: string | undefined = undefined;
    const priceText = cleanText($('span.display-price.sale').first().text());
    if (priceText) {
      // Extract just the number (e.g., "$14.00" -> "14.00")
      const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
      if (priceMatch) {
        price = priceMatch[1];
      }
    }

    // 6. Extract description (optional)
    let description: string | undefined = undefined;
    const metaDescription = cleanText($('meta[property="og:description"]').attr('content'));
    if (metaDescription) {
      description = metaDescription;
    }

    // 7. Extract gender/category from URL (optional)
    let gender: string | undefined = undefined;
    if (productUrl.includes('/mens')) {
      gender = 'mens';
    } else if (productUrl.includes('/womens')) {
      gender = 'womens';
    } else if (productUrl.includes('/kids')) {
      gender = 'kids';
    }

    // Build the ScrapedShirt object
    const scrapedShirt: ScrapedShirt = {
      title,
      designerName,
      imageUrl,
      itemNumber,
      productUrl,
      price,
      description,
      gender,
      scrapedAt: new Date(),
    };

    console.log(`[HTML Parser] Successfully parsed: "${title}" by ${designerName}`);
    return scrapedShirt;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HTML Parser] Error parsing HTML:', errorMessage);
    return null;
  }
}
