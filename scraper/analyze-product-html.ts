import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const htmlPath = join(__dirname, 'test-output', 'product-page.html');
const html = readFileSync(htmlPath, 'utf-8');

console.log('='.repeat(80));
console.log('DETAILED HTML STRUCTURE ANALYSIS');
console.log('='.repeat(80));
console.log('');

const $ = cheerio.load(html);

// 1. Find title
console.log('1. TITLE/HEADING ANALYSIS');
console.log('-'.repeat(80));
$('h1, h2').each((i, elem) => {
  const text = $(elem).text().trim();
  const classes = $(elem).attr('class');
  if (text.length > 0 && text.length < 200) {
    console.log(`${elem.tagName}: "${text}"`);
    if (classes) console.log(`  Classes: ${classes}`);
  }
});
console.log('');

// 2. Find meta tags
console.log('2. META TAG ANALYSIS');
console.log('-'.repeat(80));
$('meta[property^="og:"], meta[name="description"]').each((i, elem) => {
  const property = $(elem).attr('property') || $(elem).attr('name');
  const content = $(elem).attr('content');
  console.log(`${property}: ${content}`);
});
console.log('');

// 3. Find price elements
console.log('3. PRICE ELEMENT ANALYSIS');
console.log('-'.repeat(80));
$('[class*="price"], [data-price]').each((i, elem) => {
  const text = $(elem).text().trim();
  const classes = $(elem).attr('class');
  const dataPrice = $(elem).attr('data-price');
  if (text || dataPrice) {
    console.log(`Element: ${elem.tagName}`);
    if (text) console.log(`  Text: ${text}`);
    if (classes) console.log(`  Classes: ${classes}`);
    if (dataPrice) console.log(`  data-price: ${dataPrice}`);
  }
});
console.log('');

// 4. Find product images
console.log('4. PRODUCT IMAGE ANALYSIS');
console.log('-'.repeat(80));
const productImages: string[] = [];
$('img[src*="/products/"]').each((i, elem) => {
  const src = $(elem).attr('src');
  const alt = $(elem).attr('alt');
  const classes = $(elem).attr('class');
  if (src) {
    productImages.push(src);
    console.log(`Image ${i + 1}:`);
    console.log(`  src: ${src.substring(0, 100)}...`);
    if (alt) console.log(`  alt: ${alt}`);
    if (classes) console.log(`  classes: ${classes}`);
  }
});
console.log(`Total product images found: ${productImages.length}`);
console.log('');

// 5. Look for artist/designer info
console.log('5. ARTIST/DESIGNER ANALYSIS');
console.log('-'.repeat(80));
$('[class*="artist"], [class*="designer"], [class*="by"], a[href*="@"]').each((i, elem) => {
  const text = $(elem).text().trim();
  const href = $(elem).attr('href');
  const classes = $(elem).attr('class');
  if (text.length > 0 && text.length < 100) {
    console.log(`Element: ${elem.tagName}`);
    console.log(`  Text: ${text}`);
    if (href) console.log(`  href: ${href}`);
    if (classes) console.log(`  classes: ${classes}`);
    console.log('');
  }
});

// 6. Look for JSON in script tags
console.log('6. SCRIPT TAG ANALYSIS');
console.log('-'.repeat(80));
$('script[type="text/javascript"], script[type="application/json"]').each((i, elem) => {
  const content = $(elem).html();
  if (content && content.includes('{')) {
    const snippet = content.substring(0, 200).trim();
    console.log(`Script ${i + 1}:`);
    console.log(`  ${snippet}...`);
    console.log('');
  }
});

// 7. Check main content structure
console.log('7. MAIN CONTENT STRUCTURE');
console.log('-'.repeat(80));
const mainSelectors = ['main', '#main', '.main', '[role="main"]', '#content', '.product'];
mainSelectors.forEach(selector => {
  const elem = $(selector);
  if (elem.length > 0) {
    console.log(`Found: ${selector}`);
    console.log(`  Children count: ${elem.children().length}`);
    console.log(`  Classes: ${elem.attr('class')}`);
    console.log(`  ID: ${elem.attr('id')}`);
  }
});
console.log('');

// 8. Product-specific data attributes
console.log('8. DATA ATTRIBUTES ANALYSIS');
console.log('-'.repeat(80));
$('[data-product], [data-product-id], [data-design], [data-title]').each((i, elem) => {
  console.log(`Element: ${elem.tagName}`);
  const attrs = elem.attribs;
  Object.keys(attrs).forEach(key => {
    if (key.startsWith('data-')) {
      console.log(`  ${key}: ${attrs[key]}`);
    }
  });
  console.log('');
});

// Save a cleaned excerpt for manual inspection
const excerpt = {
  title: $('h1').first().text().trim(),
  metaTitle: $('meta[property="og:title"]').attr('content'),
  metaDescription: $('meta[property="og:description"]').attr('content'),
  metaImage: $('meta[property="og:image"]').attr('content'),
  firstProductImage: productImages[0],
  bodyClasses: $('body').attr('class'),
  mainContent: $('main').length > 0 ? 'Found <main>' : 'No <main> found'
};

const excerptPath = join(__dirname, 'test-output', 'html-excerpt.json');
writeFileSync(excerptPath, JSON.stringify(excerpt, null, 2));
console.log(`Saved excerpt to: ${excerptPath}`);
