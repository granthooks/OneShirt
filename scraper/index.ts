/**
 * Main entry point for the Threadless scraper
 *
 * This module exports all the necessary functions and types
 * for scraping Threadless.com shirts using Jina AI Reader.
 */

// Export types
export type {
  ScrapedShirt,
  ScrapeOptions,
  ScrapeResult,
  JinaReaderResponse,
} from './types';

// Export configuration
export {
  JINA_CONFIG,
  THREADLESS_CONFIG,
  SCRAPER_CONFIG,
  validateConfig,
} from './config';

// Export Jina service
export {
  fetchUrlWithJina,
  testJinaService,
  extractLinksFromMarkdown,
  extractImagesFromMarkdown,
} from './services/jinaService';

// Export Threadless service
export {
  scrapeThreadlessShirts,
  buildThreadlessUrl,
  parseProductPage,
} from './services/threadlessService';
