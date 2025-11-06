# Threadless Scraper - Admin UI

## Overview

The Threadless Scraper admin page allows admins to import t-shirt designs from Threadless.com into the OneShirt inventory by simply pasting product URLs.

## Features

### Core Functionality
- **URL Input**: Large textarea for pasting multiple Threadless product URLs (one per line)
- **File Upload**: Upload .txt files containing URLs
- **URL Validation**: Automatically validates URLs before scraping
- **Real-time Progress**: Live progress tracking with percentage and current URL
- **Activity Log**: Real-time log showing scraping activity
- **Results Display**: Visual cards showing success/failed/skipped shirts with thumbnails
- **Statistics**: Live counters for success, failed, and skipped items

### Scraping Process
1. **Fetch HTML**: Uses Bright Data Web Unlocker API to fetch product pages
2. **Parse Data**: Extracts title, designer, image URL, price, description
3. **Upload Image**: Downloads image and uploads to Supabase Storage
4. **Insert to DB**: Creates shirt record in database (with duplicate detection)
5. **Error Handling**: Gracefully handles failures and logs errors

### UI Components
- Dark theme consistent with admin panel
- Progress bar with percentage
- Live activity log (console-style)
- Result cards with:
  - Status icon (success/skipped/failed)
  - Shirt thumbnail
  - Title and designer
  - Error messages (if applicable)
- Color-coded stats cards (green/yellow/red)

## Files Created/Modified

### New Files
1. **services/scraperBrowserService.ts**
   - Browser-compatible scraper service
   - Adapts Node.js scraper code for browser environment
   - Handles Bright Data API calls, HTML parsing, image upload, DB insertion

2. **components/admin/ScraperPage.tsx**
   - Main scraper admin UI component
   - URL input, progress tracking, logs, results display
   - State management for scraping process

3. **test-urls.txt**
   - Sample URLs for testing the scraper

### Modified Files
1. **types.ts**
   - Added `SCRAPER` to `AdminPage` enum

2. **vite.config.ts**
   - Exposed `BRIGHT_DATA_API_KEY` and `BRIGHT_DATA_ZONE` to browser

3. **components/AdminDashboard.tsx**
   - Added "Import Shirts" navigation item
   - Added route to ScraperPage
   - Imported ScraperPage component

## How It Works

### Architecture
```
┌─────────────────┐
│  ScraperPage    │  (React Component)
│  (Admin UI)     │
└────────┬────────┘
         │
         ├─> scraperBrowserService.ts
         │   ├─> scrapeProductUrl()     → Fetch & Parse
         │   └─> processScrapedShirt()  → Upload & Insert
         │
         ├─> Bright Data API
         │   └─> Fetches HTML (bypasses Cloudflare)
         │
         ├─> Cheerio Parser
         │   └─> Extracts product data from HTML
         │
         ├─> Supabase Storage
         │   └─> Uploads shirt images
         │
         └─> Supabase Database
             └─> Inserts shirt records
```

### Scraping Flow
```
1. User pastes URLs
2. Click "Start Scraping"
3. For each URL:
   a. Validate URL format
   b. Fetch HTML via Bright Data
   c. Parse HTML with Cheerio
   d. Download & upload image to Supabase Storage
   e. Check for duplicates
   f. Insert into database (or skip if duplicate)
   g. Update progress & logs
   h. Wait 2 seconds (rate limiting)
4. Display final results
```

## Configuration

### Environment Variables (in .env.local)
```bash
# Already configured:
BRIGHT_DATA_API_KEY=<your-key>
BRIGHT_DATA_ZONE=residential_proxy1
VITE_SUPABASE_URL=<your-url>
VITE_SUPABASE_ANON_KEY=<your-key>
```

### Vite Config
The Bright Data credentials are exposed to the browser via `vite.config.ts`:
```typescript
define: {
  'import.meta.env.VITE_BRIGHT_DATA_API_KEY': JSON.stringify(env.BRIGHT_DATA_API_KEY),
  'import.meta.env.VITE_BRIGHT_DATA_ZONE': JSON.stringify(env.BRIGHT_DATA_ZONE)
}
```

## Testing Instructions

### 1. Access the Scraper UI
- Log in as an admin user
- Click "Admin" button in header
- Click "Import Shirts" in the sidebar

### 2. Test with Sample URL
The scraper page pre-populates with a sample URL for easy testing:
```
https://www.threadless.com/shop/@tobefonseca/design/retail-trends/mens
```

### 3. Or Upload test-urls.txt
- Click "Upload .txt file" button
- Select `test-urls.txt` from the project root
- URLs will be loaded into the textarea

### 4. Run the Scraper
- Click "Start Scraping" button
- Watch the real-time progress
- View activity log for details
- Check results section for imported shirts

### 5. Verify in Database
- Go to "Shirt Inventory" page
- Imported shirts should appear in the list
- Check that images loaded correctly

## Expected Behavior

### Success Case
- URL is valid Threadless product page
- HTML fetched successfully
- Product data extracted
- Image uploaded to Supabase Storage
- Shirt inserted into database
- Result card shows green with thumbnail

### Skipped Case (Duplicate)
- Shirt already exists in database (same name + designer)
- Image upload and DB insert are skipped
- Result card shows yellow with warning icon

### Failed Case
- Invalid URL format
- Network error (Bright Data timeout)
- Parsing error (HTML structure changed)
- Upload error (Supabase storage issue)
- DB error (constraint violation)
- Result card shows red with error message

## Limitations

### Current Limitations
1. **Sequential Processing**: URLs are scraped one at a time (not parallel)
   - Reason: Rate limiting and to avoid overwhelming Bright Data API
   - Can be improved with batch processing in future

2. **Browser Environment**: Runs in browser (not server-side)
   - Reason: Simpler architecture, no need for API endpoint
   - Limitation: User must keep browser tab open during scraping

3. **No Resume**: If scraping fails mid-way, must restart from beginning
   - Future improvement: Save progress and allow resuming

4. **Fixed Bid Threshold**: All imported shirts get threshold of 100
   - Can be customized in the code if needed

### Known Issues
1. **Cheerio in Browser**: Using Cheerio (Node.js library) in browser
   - Works via bundler transpilation
   - If issues arise, consider switching to DOMParser

2. **Rate Limiting**: 2-second delay between requests
   - May need adjustment based on Bright Data limits

## Troubleshooting

### Issue: "BRIGHT_DATA_API_KEY not configured"
**Solution**:
- Check that `.env.local` has the API key
- Restart dev server: `npm run dev`
- Clear browser cache

### Issue: Scraper hangs on "Fetching..."
**Solution**:
- Check browser console for errors
- Verify Bright Data API key is valid
- Check network tab for API response

### Issue: "Failed to parse product page"
**Solution**:
- Threadless may have changed their HTML structure
- Update the parser in `scraperBrowserService.ts`
- Check the activity log for specific parsing errors

### Issue: Image upload fails
**Solution**:
- Check Supabase Storage bucket permissions
- Verify `shirt-images` bucket exists
- Check browser console for CORS errors

### Issue: Duplicate detection not working
**Solution**:
- Check database constraints on `shirts` table
- Verify `name` and `designer` columns are populated correctly

## Future Enhancements

### Planned Features
1. **Batch Processing**: Scrape multiple URLs in parallel (with concurrency limit)
2. **Resume Capability**: Save progress and allow resuming failed scrapes
3. **Custom Bid Threshold**: Allow setting bid threshold per shirt
4. **URL History**: Remember previously scraped URLs
5. **Auto-Retry**: Automatically retry failed URLs
6. **Export Results**: Download results as CSV/JSON
7. **Scheduled Scraping**: Set up periodic scraping jobs
8. **URL Discovery**: Auto-discover product URLs from category pages

### Code Improvements
1. **Error Recovery**: Better error handling with retry logic
2. **Caching**: Cache fetched HTML to avoid re-fetching
3. **Validation**: More robust URL validation
4. **Performance**: Optimize image upload (resize/compress)
5. **Testing**: Add unit tests for scraper functions

## API Usage

### scraperBrowserService.ts API

#### `scrapeProductUrl(url: string): Promise<ScrapeResult>`
Scrapes a single Threadless product URL.

**Returns:**
```typescript
{
  success: boolean;
  shirt?: ScrapedShirt;
  error?: string;
}
```

#### `processScrapedShirt(shirt: ScrapedShirt): Promise<ProcessResult>`
Uploads image and inserts shirt into database.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
  skipped?: boolean;  // true if duplicate
}
```

#### `isValidThreadlessProductUrl(url: string): boolean`
Validates if URL is a Threadless product page.

**Returns:** `true` if valid, `false` otherwise

## Support

For issues or questions:
1. Check the activity log in the scraper UI
2. Check browser console for errors
3. Review this README for troubleshooting steps
4. Contact the development team

## License

Part of the OneShirt project.
