/**
 * Configuration for the Threadless scraper
 */

/**
 * Jina AI Reader API configuration
 * Get your API key from: https://jina.ai/
 */
export const JINA_CONFIG = {
  /** Jina AI API key - loaded from environment variable */
  apiKey: process.env.JINA_API_KEY || '',

  /** Base URL for Jina AI Reader */
  baseUrl: 'https://r.jina.ai',

  /** Request timeout in milliseconds */
  timeout: 30000,

  /** Whether to include images in the markdown output */
  includeImages: true,

  /** Whether to return JSON response (if supported) */
  returnJson: false,
} as const;

/**
 * Threadless website configuration
 */
export const THREADLESS_CONFIG = {
  /** Base URL for Threadless website */
  baseUrl: 'https://www.threadless.com',

  /** Default search endpoint */
  searchEndpoint: '/search',

  /** Default discover endpoint */
  discoverEndpoint: '/discover/t-shirts',

  /** User agent for requests */
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

/**
 * Scraper default settings
 */
export const SCRAPER_CONFIG = {
  /** Default number of shirts to scrape */
  defaultShirtCount: 10,

  /** Maximum number of shirts to scrape in a single operation */
  maxShirtCount: 100,

  /** Default gender filter */
  defaultGender: 'all' as const,

  /** Default sort order */
  defaultSort: 'popular' as const,

  /** Maximum number of pages to scrape */
  maxPages: 5,

  /** Delay between requests in milliseconds (to be respectful) */
  requestDelay: 1000,

  /** Maximum retries for failed requests */
  maxRetries: 3,
} as const;

/**
 * Validates that required configuration is present
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!JINA_CONFIG.apiKey) {
    errors.push('JINA_API_KEY environment variable is not set');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
