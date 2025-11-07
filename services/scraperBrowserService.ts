/**
 * Browser-compatible scraper service for admin UI
 * This adapts the Node.js scraper services to work in the browser
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabaseClient';
import * as cheerio from 'cheerio';

export interface ScrapedShirt {
  imageUrl: string;
  designerName: string;
  itemNumber: string;
  title: string;
  description?: string;
  productUrl: string;
  price?: string;
  gender?: string;
  scrapedAt: Date;
}

export interface ScrapeProgress {
  status: 'idle' | 'scraping' | 'complete' | 'error';
  currentUrl: string;
  currentIndex: number;
  totalUrls: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface ScrapeResult {
  success: boolean;
  shirt?: ScrapedShirt;
  error?: string;
  skipped?: boolean;
}

/**
 * Browser-compatible Bright Data fetcher
 */
async function fetchUrlWithBrightData(url: string): Promise<{ content: string; error?: string }> {
  try {
    const apiKey = import.meta.env.VITE_BRIGHT_DATA_API_KEY;
    const zone = import.meta.env.VITE_BRIGHT_DATA_ZONE || 'residential_proxy1';

    if (!apiKey) {
      throw new Error('BRIGHT_DATA_API_KEY not configured');
    }

    console.log(`[Bright Data] Fetching: ${url}`);

    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        zone: zone,
        url: url,
        format: 'raw',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const content = await response.text();
    console.log(`[Bright Data] Success: ${content.length} chars`);

    return { content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Bright Data] Error:`, errorMessage);
    return { content: '', error: errorMessage };
  }
}

/**
 * Parse Threadless product page HTML
 */
function parseThreadlessProductPage(html: string, productUrl: string): ScrapedShirt | null {
  try {
    const $ = cheerio.load(html);

    // Check if it's a 404 page
    const pageTitle = $('title').text();
    if (pageTitle.includes('404') || pageTitle.includes('Error - Page Not Found')) {
      console.error('[Parser] 404 page detected');
      return null;
    }

    // Extract title
    let title = $('h1.productPicker-title').first().text().trim();
    if (!title) {
      title = $('meta[property="og:title"]').attr('content') || '';
    }
    if (!title) {
      title = $('h1').first().text().trim();
    }

    if (!title) {
      console.error('[Parser] No title found');
      return null;
    }

    // Clean title
    title = title.replace(/\s+by\s+[^|]+\|[^|]+$/, '').trim();
    title = title.replace(/\s+T-Shirt$/, '').trim();

    // Extract designer name
    let designerName = '';
    const urlMatch = productUrl.match(/\/@([^/]+)/);
    if (urlMatch) {
      designerName = urlMatch[1];
    } else {
      const shopName = $('h2.productPicker-shop-name').first().text().trim();
      const match = shopName.match(/by\s+([^\s]+)/i);
      if (match) {
        designerName = match[1];
      }
    }

    if (!designerName) {
      console.error('[Parser] No designer name found');
      return null;
    }

    // Extract image URL
    let imageUrl = $('meta[property="og:image"]').attr('content') || '';
    if (!imageUrl) {
      imageUrl = $('img.productHero-image').first().attr('src') || '';
    }
    if (!imageUrl) {
      imageUrl = $('img[src*="/products/"]').first().attr('src') || '';
    }

    imageUrl = imageUrl.replace(/&amp;/g, '&');

    if (!imageUrl) {
      console.error('[Parser] No image URL found');
      return null;
    }

    // Extract item number from image URL
    let itemNumber = '';
    const idMatch = imageUrl.match(/\/products\/(\d+)\//);
    if (idMatch) {
      itemNumber = idMatch[1];
    } else {
      // Fallback: use base64 hash of URL
      itemNumber = `url-${btoa(productUrl).substring(0, 12)}`;
    }

    // Extract price (optional)
    let price: string | undefined = undefined;
    const priceText = $('span.display-price.sale').first().text().trim();
    if (priceText) {
      const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
      if (priceMatch) {
        price = priceMatch[1];
      }
    }

    // Extract description (optional)
    const description = $('meta[property="og:description"]').attr('content');

    // Extract gender from URL
    let gender: string | undefined = undefined;
    if (productUrl.includes('/mens')) {
      gender = 'mens';
    } else if (productUrl.includes('/womens')) {
      gender = 'womens';
    } else if (productUrl.includes('/kids')) {
      gender = 'kids';
    }

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

    console.log(`[Parser] Success: "${title}" by ${designerName}`);
    return scrapedShirt;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Parser] Error:', errorMessage);
    return null;
  }
}

/**
 * Validate if URL is a valid Threadless product URL
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
 * Scrape a single Threadless product URL
 */
export async function scrapeProductUrl(url: string): Promise<ScrapeResult> {
  try {
    console.log(`[Scraper] Scraping: ${url}`);

    // Validate URL
    if (!isValidThreadlessProductUrl(url)) {
      return {
        success: false,
        error: 'Invalid Threadless product URL',
      };
    }

    // Fetch HTML
    const response = await fetchUrlWithBrightData(url);
    if (response.error || !response.content) {
      return {
        success: false,
        error: response.error || 'Failed to fetch URL',
      };
    }

    // Parse HTML
    const product = parseThreadlessProductPage(response.content, url);
    if (!product) {
      return {
        success: false,
        error: 'Failed to parse product page',
      };
    }

    return {
      success: true,
      shirt: product,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImageToStorage(imageUrl: string): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const proxyUrl = import.meta.env.VITE_IMAGE_PROXY_URL || 'http://localhost:3100';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  console.log(`[Storage] Downloading image from: ${imageUrl}`);

  try {
    // Use proxy server to fetch the image (bypasses CORS)
    const proxyRequestUrl = `${proxyUrl}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    console.log(`[Storage] Using proxy: ${proxyRequestUrl}`);

    const response = await fetch(proxyRequestUrl);

    console.log(`[Storage] Proxy response status: ${response.status}`);
    console.log(`[Storage] Proxy response ok: ${response.ok}`);

    if (!response.ok) {
      // If proxy fails, try direct fetch as fallback
      console.warn(`[Storage] Proxy failed, attempting direct fetch...`);
      const directResponse = await fetch(imageUrl);

      if (!directResponse.ok) {
        throw new Error(`Failed to fetch image via proxy and direct: HTTP ${response.status} ${response.statusText}`);
      }

      console.log(`[Storage] Direct fetch successful (fallback)`);
      return await processImageResponse(directResponse, supabase);
    }

    console.log(`[Storage] Proxy fetch successful`);
    return await processImageResponse(response, supabase);

  } catch (error) {
    // Enhanced error logging
    console.error(`[Storage] ERROR downloading/uploading image:`, error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`CORS Error: Cannot download image from ${imageUrl}. The image URL may be blocked by CORS policy. Make sure the image proxy server is running (npm run server). Original error: ${error.message}`);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Unknown error uploading image: ${String(error)}`);
  }
}

/**
 * Process image response and upload to Supabase
 */
async function processImageResponse(response: Response, supabase: any): Promise<string> {
  console.log(`[Storage] Converting image to blob...`);
  const imageBuffer = await response.arrayBuffer();
  const imageBlob = new Blob([imageBuffer]);

  console.log(`[Storage] Image size: ${imageBlob.size} bytes`);

  // Generate filename
  const contentType = response.headers.get('content-type');
  console.log(`[Storage] Content-Type: ${contentType}`);

  let extension = 'jpg';
  if (contentType?.includes('png')) {
    extension = 'png';
  } else if (contentType?.includes('webp')) {
    extension = 'webp';
  }

  const filename = `scraped-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

  console.log(`[Storage] Uploading to Supabase as: ${filename}`);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('shirt-images')
    .upload(filename, imageBlob, {
      contentType: response.headers.get('content-type') || 'image/jpeg',
      upsert: false,
    });

  if (error) {
    console.error(`[Storage] Upload error:`, error);
    throw new Error(`Storage upload error: ${error.message} (Code: ${error.name})`);
  }

  console.log(`[Storage] Upload successful, getting public URL...`);

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('shirt-images')
    .getPublicUrl(data.path);

  console.log(`[Storage] Public URL: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
}

/**
 * Check if shirt already exists in database
 */
async function shirtExists(name: string, designer: string): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('shirts')
    .select('id')
    .eq('name', name)
    .eq('designer', designer)
    .limit(1);

  if (error) {
    console.error('[DB] Error checking duplicate:', error.message);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Insert shirt into database
 */
export async function insertShirtIntoDatabase(
  shirt: ScrapedShirt,
  imageStorageUrl: string
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    console.log(`[DB] Checking for duplicate: "${shirt.title}"`);

    // Check if shirt already exists
    const exists = await shirtExists(shirt.title, shirt.designerName);
    if (exists) {
      console.log(`[DB] Skipped (duplicate): "${shirt.title}"`);
      return { success: true, skipped: true };
    }

    console.log(`[DB] Inserting: "${shirt.title}"`);

    // Insert the shirt
    const { error } = await supabase
      .from('shirts')
      .insert({
        name: shirt.title,
        designer: shirt.designerName,
        image_url: imageStorageUrl,
        status: 'active',
        current_bid_count: 0,
        bid_threshold: 100,
        like_count: 0,
      });

    if (error) {
      throw new Error(`Database insert error: ${error.message}`);
    }

    console.log(`[DB] Successfully inserted: "${shirt.title}"`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DB] Error:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Process a scraped shirt: upload image and insert into database
 */
export async function processScrapedShirt(shirt: ScrapedShirt): Promise<{
  success: boolean;
  error?: string;
  skipped?: boolean;
}> {
  try {
    console.log(`[Process] Starting processing for: "${shirt.title}"`);
    console.log(`[Process] Image URL: ${shirt.imageUrl}`);
    console.log(`[Process] Designer: ${shirt.designerName}`);

    // Upload image
    console.log(`[Process] Step 1: Uploading image to storage...`);
    const imageStorageUrl = await uploadImageToStorage(shirt.imageUrl);
    console.log(`[Process] Step 1: Complete - Storage URL: ${imageStorageUrl}`);

    // Insert into database
    console.log(`[Process] Step 2: Inserting into database...`);
    const result = await insertShirtIntoDatabase(shirt, imageStorageUrl);
    console.log(`[Process] Step 2: Complete - Result:`, result);

    return result;

  } catch (error) {
    console.error(`[Process] ERROR:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[Process] Error message: ${errorMessage}`);
    if (errorStack) {
      console.error(`[Process] Error stack:`, errorStack);
    }

    return { success: false, error: errorMessage };
  }
}
