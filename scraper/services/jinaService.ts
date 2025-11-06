/**
 * Service for interacting with Jina AI Reader API
 *
 * Jina AI Reader (r.jina.ai) converts any URL into clean, LLM-friendly markdown.
 * This is perfect for web scraping because it:
 * - Removes ads, navigation, and other clutter
 * - Converts HTML to clean markdown
 * - Preserves important content structure
 * - Works without JavaScript execution
 */

import { JINA_CONFIG, THREADLESS_CONFIG } from '../config';
import type { JinaReaderResponse } from '../types';

/**
 * Fetches and converts a URL to markdown using Jina AI Reader
 *
 * How it works:
 * 1. Prepend the Jina Reader URL (https://r.jina.ai) to any URL
 * 2. Make a GET request
 * 3. Receive clean markdown content
 *
 * @param url - The URL to fetch and convert
 * @param options - Optional configuration for the request
 * @returns The converted markdown content
 */
export async function fetchUrlWithJina(
  url: string,
  options: {
    includeImages?: boolean;
    timeout?: number;
  } = {}
): Promise<JinaReaderResponse> {
  const {
    includeImages = JINA_CONFIG.includeImages,
    timeout = JINA_CONFIG.timeout,
  } = options;

  try {
    // Construct the Jina Reader URL
    const jinaUrl = `${JINA_CONFIG.baseUrl}/${url}`;

    // Prepare headers
    const headers: HeadersInit = {
      'User-Agent': THREADLESS_CONFIG.userAgent,
    };

    // Add API key if available (for authenticated requests with higher limits)
    if (JINA_CONFIG.apiKey) {
      headers['Authorization'] = `Bearer ${JINA_CONFIG.apiKey}`;
    }

    // Add custom headers for Jina options
    if (!includeImages) {
      headers['X-No-Images'] = 'true';
    }

    console.log(`[Jina Service] Fetching: ${url}`);
    console.log(`[Jina Service] Using Jina URL: ${jinaUrl}`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Make the request
      const response = await fetch(jinaUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the response text (markdown content)
      const content = await response.text();

      // Parse the title from markdown if present
      const titleMatch = content.match(/^Title: (.+)$/m);
      const title = titleMatch ? titleMatch[1] : undefined;

      console.log(`[Jina Service] Successfully fetched ${url} (${content.length} chars)`);

      return {
        content,
        url,
        title,
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
    console.error(`[Jina Service] Error fetching ${url}:`, errorMessage);

    return {
      content: '',
      url,
      error: errorMessage,
      status: 0,
    };
  }
}

/**
 * Tests the Jina service with a simple URL
 * Useful for debugging and verifying API key is working
 */
export async function testJinaService(): Promise<boolean> {
  try {
    console.log('[Jina Service] Running test...');
    const testUrl = 'https://example.com';
    const result = await fetchUrlWithJina(testUrl);

    if (result.error) {
      console.error('[Jina Service] Test failed:', result.error);
      return false;
    }

    if (result.content.length === 0) {
      console.error('[Jina Service] Test failed: Empty content');
      return false;
    }

    console.log('[Jina Service] Test passed!');
    console.log(`[Jina Service] Content length: ${result.content.length} chars`);
    return true;
  } catch (error) {
    console.error('[Jina Service] Test error:', error);
    return false;
  }
}

/**
 * Extracts links from markdown content
 * Useful for finding product links in search results
 *
 * @param markdown - The markdown content to parse
 * @returns Array of URLs found in the markdown
 */
export function extractLinksFromMarkdown(markdown: string): string[] {
  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(markdown)) !== null) {
    const url = match[2];
    // Filter out anchor links and mailto links
    if (url && !url.startsWith('#') && !url.startsWith('mailto:')) {
      links.push(url);
    }
  }

  return links;
}

/**
 * Extracts images from markdown content
 * Useful for finding product images
 *
 * @param markdown - The markdown content to parse
 * @returns Array of image URLs found in the markdown
 */
export function extractImagesFromMarkdown(markdown: string): Array<{ alt: string; url: string }> {
  // Regex to match markdown images: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: Array<{ alt: string; url: string }> = [];
  let match;

  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push({
      alt: match[1],
      url: match[2],
    });
  }

  return images;
}
