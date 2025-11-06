# Threadless Product Scraper

A command-line tool to scrape Threadless product pages and import them into the OneShirt database.

## Features

- Scrapes individual Threadless product URLs
- Extracts product data: title, designer, image, price, description
- Downloads product images and uploads to Supabase Storage
- Inserts product data into the database
- Duplicate detection (skips products already in database)
- Progress logging and error handling
- Sequential processing with configurable delays

## Prerequisites

- Node.js 18+ installed
- Bright Data account with residential_proxy1 zone configured
- Supabase project with shirt-images bucket

## Environment Variables

Required in `.env.local`:

```env
BRIGHT_DATA_API_KEY=your_api_key
BRIGHT_DATA_ZONE=residential_proxy1
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Installation

All dependencies are already installed in the main project. No additional setup needed.

## Usage

### 1. Scrape URLs from command line

```bash
npm run scrape:urls -- https://www.threadless.com/shop/@artist/design/design-name
```

Or with multiple URLs:

```bash
npx tsx scraper/scrape.ts "URL1" "URL2" "URL3"
```

### 2. Scrape URLs from a file

Create a file with URLs (one per line):

```bash
npm run scrape:file
```

This reads from `scraper/urls.txt` by default.

Or specify a custom file:

```bash
npx tsx scraper/scrape.ts --file=my-urls.txt
```

### Example urls.txt format:

```
# Lines starting with # are comments
https://www.threadless.com/shop/@artist1/design/design-name-1
https://www.threadless.com/shop/@artist2/design/design-name-2
https://www.threadless.com/shop/@artist3/design/design-name-3
```

## How It Works

### Step 1: Scraping Product Pages

For each URL:
1. Validates the URL is a Threadless product page
2. Fetches HTML using Bright Data (bypasses anti-bot protection)
3. Parses HTML with Cheerio to extract:
   - Title (from h1 or meta tags)
   - Designer name (from URL or page content)
   - Product image URL (high-res from meta og:image)
   - Price (optional)
   - Description (optional)
   - Product ID (from image URL)

### Step 2: Uploading to Database

For each scraped product:
1. Downloads product image from Threadless CDN
2. Uploads image to Supabase Storage (`shirt-images` bucket)
3. Checks if product already exists (by name + designer)
4. Inserts product into `shirts` table if new
5. Logs progress and results

## CSS Selectors Used

The parser uses these selectors to extract data:

```typescript
// Title
h1.productPicker-title
meta[property="og:title"]

// Designer
URL pattern: /@username/
h2.productPicker-shop-name

// Image
meta[property="og:image"]
img.productHero-image

// Price
span.display-price.sale

// Description
meta[property="og:description"]
```

## Sample Output

```
================================================================================
THREADLESS SCRAPER
================================================================================

Found 3 URLs to process

Processing 3 valid URLs...

================================================================================
STEP 1: SCRAPING PRODUCT PAGES
================================================================================

[Threadless Service] Scraping 3 URLs...
[Threadless Service] Processing 1/3: https://www.threadless.com/...
[Bright Data] Fetching: https://www.threadless.com/...
[Bright Data] Successfully fetched (199706 chars)
[HTML Parser] Successfully parsed: "Product Name" by artist
[Threadless Service] ✓ Success: "Product Name"

[Threadless Service] Waiting 2000ms before next request...
...

Successfully scraped 3 products

================================================================================
STEP 2: UPLOADING TO DATABASE
================================================================================

[1/3] Processing: "Product Name" by artist
[Supabase Service] Downloading image: https://cdn-images.threadless.com/...
[Supabase Service] Uploading as: scraped-1762390269099-ev5ua5.webp
[Supabase Service] ✓ Image uploaded successfully
[Supabase Service] Checking for duplicate: "Product Name"
[Supabase Service] ✓ Successfully inserted: "Product Name"

================================================================================
PROCESSING COMPLETE
================================================================================
Total:    3
Success:  2
Skipped:  1 (duplicates)
Failed:   0
================================================================================
```

## Finding Threadless URLs

1. Go to https://www.threadless.com
2. Browse or search for designs
3. Click on a product
4. Copy the URL from the browser address bar
5. The URL should match this pattern:
   ```
   https://www.threadless.com/shop/@artist/design/design-name
   ```

## Testing

Test files are included for development:

- `test-product-fetch.ts` - Fetches and analyzes a product page
- `analyze-product-html.ts` - Detailed HTML structure analysis
- `extract-urls.ts` - Extracts product URLs from homepage HTML

Run tests:

```bash
npx tsx scraper/test-product-fetch.ts "URL"
npx tsx scraper/analyze-product-html.ts
```

## Error Handling

The scraper handles:
- Invalid URLs (skipped with warning)
- Failed HTTP requests (logged and skipped)
- Parse failures (logged and skipped)
- Duplicate products (skipped, not counted as error)
- Image download failures (logged as error)
- Database insert failures (logged as error)

Exit codes:
- `0` - Success (all products processed)
- `1` - Failure (one or more errors occurred)

## Rate Limiting

The scraper includes a 2-second delay between requests by default. This:
- Prevents overwhelming Bright Data or Threadless
- Reduces chance of rate limiting
- Is configurable in the code if needed

## Limitations

- Only scrapes product detail pages (not search/browse pages)
- Requires manual URL collection (no auto-discovery)
- Limited to Threadless.com product pages
- Depends on current HTML structure (may break if Threadless changes their layout)

## Troubleshooting

### "Failed to fetch" errors
- Check Bright Data API key and zone name
- Verify Bright Data account has credits
- Try a different zone if residential_proxy1 doesn't work

### "Failed to parse" errors
- The URL might be a 404 page
- Threadless might have changed their HTML structure
- Run `test-product-fetch.ts` to debug

### "Failed to upload image" errors
- Check Supabase credentials
- Verify `shirt-images` bucket exists
- Check bucket permissions (should allow public uploads)

### Duplicate detection not working
- Verify database connection
- Check that `name` and `designer` fields match exactly

## File Structure

```
scraper/
├── services/
│   ├── brightDataService.ts    # Bright Data API integration
│   ├── htmlParser.ts           # HTML parsing with Cheerio
│   ├── threadlessService.ts    # Main scraping logic
│   └── supabaseService.ts      # Database and storage operations
├── config.ts                   # Configuration constants
├── types.ts                    # TypeScript type definitions
├── scrape.ts                   # Main CLI script
├── urls.txt                    # Sample URLs file
├── test-product-fetch.ts       # Testing utility
├── analyze-product-html.ts     # HTML analysis utility
└── README.md                   # This file
```

## Future Improvements

- Auto-discovery: Scrape search/browse pages to find products
- Batch processing: Process multiple URLs in parallel
- Caching: Store HTML locally to avoid re-fetching
- Scheduling: Run scraper on a schedule (cron)
- Web UI: Upload URLs through a web interface
- Advanced filtering: Filter by category, price, popularity
