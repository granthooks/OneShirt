/**
 * Service for interacting with Bright Data Web Unlocker API
 *
 * Bright Data Web Unlocker provides:
 * - Automatic proxy rotation
 * - Anti-bot bypass
 * - CAPTCHA solving
 * - IP rotation
 * - Full HTML content
 */

/**
 * Gets Bright Data configuration from environment
 * (function instead of const to read env at runtime)
 */
function getBrightDataConfig() {
  return {
    /** Bright Data API endpoint */
    apiUrl: 'https://api.brightdata.com/request',

    /** API key from environment */
    apiKey: process.env.BRIGHT_DATA_API_KEY || '',

    /** Zone name (e.g., 'unlocker', 'web_unlocker1') */
    zone: process.env.BRIGHT_DATA_ZONE || 'unlocker',

    /** Request timeout in milliseconds */
    timeout: 60000, // 60 seconds for Bright Data

    /** Format of response (raw HTML, JSON, etc.) */
    format: 'raw' as const,
  };
}

/**
 * Configuration for Bright Data API
 */
export const BRIGHT_DATA_CONFIG = {
  get apiUrl() { return getBrightDataConfig().apiUrl; },
  get apiKey() { return getBrightDataConfig().apiKey; },
  get zone() { return getBrightDataConfig().zone; },
  get timeout() { return getBrightDataConfig().timeout; },
  get format() { return getBrightDataConfig().format; },
};

/**
 * Response from Bright Data API
 */
export interface BrightDataResponse {
  /** The HTML content */
  content: string;

  /** The original URL that was fetched */
  url: string;

  /** HTTP status code */
  status?: number;

  /** Any error message */
  error?: string;
}

/**
 * Fetches a URL using Bright Data Web Unlocker
 *
 * How it works:
 * 1. Makes POST request to Bright Data API
 * 2. Sends zone, url, and format in request body
 * 3. Receives full HTML content
 *
 * @param url - The URL to fetch
 * @param options - Optional configuration for the request
 * @returns The HTML content
 */
export async function fetchUrlWithBrightData(
  url: string,
  options: {
    timeout?: number;
    zone?: string;
  } = {}
): Promise<BrightDataResponse> {
  const {
    timeout = BRIGHT_DATA_CONFIG.timeout,
    zone = BRIGHT_DATA_CONFIG.zone,
  } = options;

  try {
    if (!BRIGHT_DATA_CONFIG.apiKey) {
      throw new Error('BRIGHT_DATA_API_KEY environment variable is not set');
    }

    console.log(`[Bright Data] Fetching: ${url}`);
    console.log(`[Bright Data] Using zone: ${zone}`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Make the request to Bright Data API
      // Include browser-like headers to better bypass Cloudflare
      const response = await fetch(BRIGHT_DATA_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRIGHT_DATA_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          zone: zone,
          url: url,
          format: BRIGHT_DATA_CONFIG.format,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      // Get the response text (HTML content)
      const content = await response.text();

      console.log(`[Bright Data] Successfully fetched ${url} (${content.length} chars)`);

      return {
        content,
        url,
        status: response.status,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw fetchError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Bright Data] Error fetching ${url}:`, errorMessage);

    return {
      content: '',
      url,
      error: errorMessage,
      status: 0,
    };
  }
}

/**
 * Tests the Bright Data service with a simple URL
 * Useful for debugging and verifying API key is working
 */
export async function testBrightDataService(testUrl?: string): Promise<boolean> {
  try {
    console.log('[Bright Data] Running test...');
    const url = testUrl || 'https://example.com';
    const result = await fetchUrlWithBrightData(url);

    if (result.error) {
      console.error('[Bright Data] Test failed:', result.error);
      return false;
    }

    if (result.content.length === 0) {
      console.error('[Bright Data] Test failed: Empty content');
      return false;
    }

    console.log('[Bright Data] Test passed!');
    console.log(`[Bright Data] Content length: ${result.content.length} chars`);
    console.log(`[Bright Data] First 200 chars:`, result.content.substring(0, 200));
    return true;
  } catch (error) {
    console.error('[Bright Data] Test error:', error);
    return false;
  }
}
