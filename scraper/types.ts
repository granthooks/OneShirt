/**
 * TypeScript types for the Threadless scraper
 */

/**
 * Represents a scraped t-shirt from Threadless
 */
export interface ScrapedShirt {
  /** The direct URL to the t-shirt image */
  imageUrl: string;

  /** The name of the designer/artist */
  designerName: string;

  /** Unique item number or SKU from Threadless */
  itemNumber: string;

  /** The title/name of the design */
  title: string;

  /** Description of the design (if available) */
  description?: string;

  /** The URL to the product page on Threadless */
  productUrl: string;

  /** Price of the shirt (if available) */
  price?: string;

  /** Gender/category (e.g., "mens", "womens", "unisex") */
  gender?: string;

  /** Timestamp when the shirt was scraped */
  scrapedAt: Date;
}

/**
 * Options for scraping Threadless shirts
 */
export interface ScrapeOptions {
  /** Search phrase to find specific designs (optional) */
  searchPhrase?: string;

  /** Number of shirts to scrape (default: 10) */
  count?: number;

  /** Filter by gender/category */
  genderFilter?: 'mens' | 'womens' | 'unisex' | 'all';

  /** Sort order (default: 'popular') */
  sortBy?: 'popular' | 'recent' | 'trending';

  /** Maximum number of pages to scrape */
  maxPages?: number;
}

/**
 * Result of a scraping operation
 */
export interface ScrapeResult {
  /** Array of successfully scraped shirts */
  shirts: ScrapedShirt[];

  /** Number of shirts scraped */
  count: number;

  /** Any errors encountered during scraping */
  errors?: string[];

  /** Timestamp when scraping completed */
  completedAt: Date;
}

/**
 * Response from Jina AI Reader API
 */
export interface JinaReaderResponse {
  /** The converted markdown content */
  content: string;

  /** The original URL that was converted */
  url: string;

  /** Title of the page */
  title?: string;

  /** HTTP status code */
  status?: number;

  /** Any error message */
  error?: string;
}
