import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const htmlPath = join(__dirname, 'test-output', 'product-page.html');
const html = readFileSync(htmlPath, 'utf-8');

// Extract product URLs
const productLinkRegex = /href="(\/shop\/[^"]+)"/g;
const matches = [...html.matchAll(productLinkRegex)];

const uniqueUrls = new Set<string>();
matches.forEach(match => {
  const url = match[1];
  // Only take base product URLs (without /mens, /womens, etc.)
  const baseUrl = url.split('?')[0]; // Remove query params
  uniqueUrls.add(baseUrl);
});

console.log('Found', uniqueUrls.size, 'unique product URLs:');
console.log('');

const urlArray = Array.from(uniqueUrls).slice(0, 10);
urlArray.forEach((url, i) => {
  console.log(`${i + 1}. https://www.threadless.com${url}`);
});
