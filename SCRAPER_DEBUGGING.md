# Scraper Debugging Enhancement

## Overview
This document describes the enhanced error logging added to the Threadless scraper to identify and fix the "Failed to fetch" error that was occurring during the image processing step.

## Problem Description

### Original Error
```
[11:38:22 AM] • Processing: "DOUBLE OSCAR"...
[11:38:23 AM] ✗ Failed to process: Failed to fetch
[11:38:23 AM] ✓ Scraping complete! Success: 0, Failed: 0, Skipped: 0
```

**Issues Identified:**
1. Generic "Failed to fetch" error with no details
2. Final counts showing 0 for all categories (incorrect)
3. No visibility into which step of processing failed

## Root Cause Analysis

The error occurs in the `uploadImageToStorage()` function when attempting to download the image from Threadless:

```typescript
const response = await fetch(imageUrl);
```

**Likely cause**: **CORS (Cross-Origin Resource Sharing) policy blocking**

When the browser tries to fetch an image directly from `images.threadless.com`, the Threadless server may block the request due to CORS restrictions. This is a common security measure to prevent unauthorized downloading of images from other domains.

## Enhanced Error Logging

### Changes Made

#### 1. Enhanced `uploadImageToStorage()` Function
**File**: `services/scraperBrowserService.ts`

**Added detailed logging:**
```typescript
✓ Image URL being downloaded
✓ Fetch response status and ok flag
✓ Content-Type of the image
✓ Image size in bytes
✓ Upload filename
✓ Supabase storage errors with error code
✓ Public URL generated
✓ Specific CORS error detection
```

**Error detection:**
- Detects CORS errors specifically: `TypeError` with "fetch" in message
- Logs full error object, not just message
- Includes error stack trace for debugging

#### 2. Enhanced `processScrapedShirt()` Function
**File**: `services/scraperBrowserService.ts`

**Added step-by-step logging:**
```typescript
[Process] Starting processing for: "SHIRT NAME"
[Process] Image URL: https://...
[Process] Designer: designer-name
[Process] Step 1: Uploading image to storage...
[Process] Step 1: Complete - Storage URL: https://...
[Process] Step 2: Inserting into database...
[Process] Step 2: Complete - Result: {...}
```

**Error logging:**
- Full error object logged
- Error message logged separately
- Error stack trace logged (if available)

#### 3. Fixed Final Count Reporting
**File**: `components/admin/ScraperPage.tsx`

**Problem**: Using stale state values in the final log message.

**Solution**: Access the updated state values from within the setState callback:
```typescript
setProgress(prev => {
  const finalProgress = { ...prev, status: 'complete' };
  addLog(`Scraping complete! Success: ${finalProgress.successCount}, ...`);
  return finalProgress;
});
```

## Testing the Enhanced Logging

### Step 1: Access the Scraper
1. Start the dev server: `npm run dev`
2. Log in as admin
3. Navigate to Admin > Import Shirts

### Step 2: Test with the Failing URL
Paste this URL into the scraper:
```
https://www.threadless.com/shop/@alfbocreative/design/double-oscar/mens/t-shirt/regular?color=smoke&variation=front#m
```

### Step 3: Monitor Browser Console
Open browser DevTools (F12) and watch the Console tab.

### Expected Enhanced Output

#### If CORS Error:
```
[Process] Starting processing for: "DOUBLE OSCAR"
[Process] Image URL: https://images.threadless.com/products/12345/...
[Process] Designer: alfbocreative
[Process] Step 1: Uploading image to storage...
[Storage] Downloading image from: https://images.threadless.com/products/12345/...
[Storage] ERROR downloading/uploading image: TypeError: Failed to fetch
[Process] ERROR: Error: CORS Error: Cannot download image from https://images.threadless.com/products/12345/.... The image URL may be blocked by CORS policy. Original error: Failed to fetch
[Process] Error message: CORS Error: Cannot download image...
```

#### If HTTP Error:
```
[Storage] Fetch response status: 403
[Storage] Fetch response ok: false
[Process] ERROR: Error: Failed to fetch image: HTTP 403 Forbidden
```

#### If Supabase Error:
```
[Storage] Uploading to Supabase as: scraped-1699123456789-abc123.jpg
[Storage] Upload error: { message: "...", name: "StorageError" }
[Process] ERROR: Error: Storage upload error: ... (Code: StorageError)
```

## Solutions to Common Issues

### Solution 1: CORS Proxy (Recommended)
**Problem**: Browser can't download images directly from Threadless due to CORS.

**Fix**: Create a backend proxy endpoint that downloads the image server-side (where CORS doesn't apply):

```typescript
// Backend API endpoint (Node.js/Express)
app.post('/api/proxy-image', async (req, res) => {
  const { imageUrl } = req.body;

  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 ...',
      'Referer': 'https://www.threadless.com/'
    }
  });

  const buffer = await response.arrayBuffer();
  res.send(Buffer.from(buffer));
});
```

Then modify `uploadImageToStorage()`:
```typescript
// Instead of direct fetch
const response = await fetch(imageUrl);

// Use proxy
const response = await fetch('/api/proxy-image', {
  method: 'POST',
  body: JSON.stringify({ imageUrl }),
  headers: { 'Content-Type': 'application/json' }
});
```

### Solution 2: Use Image URL Directly
**Problem**: Downloading image causes issues.

**Fix**: Instead of downloading and re-uploading, use Supabase's URL storage capability or store the external URL directly:

```typescript
async function processScrapedShirt(shirt: ScrapedShirt) {
  // Option A: Store external URL directly in database
  return await insertShirtIntoDatabase(shirt, shirt.imageUrl);

  // Option B: Use Supabase to fetch and store (server-side)
  // Supabase storage can fetch from URL if configured
}
```

**Pros**: Simpler, faster, no CORS issues
**Cons**: External dependency, images could break if Threadless removes them

### Solution 3: Bright Data Image Download
**Problem**: Browser CORS restrictions.

**Fix**: Use Bright Data to download images (since they're already handling the HTML fetching):

```typescript
async function downloadImageViaBrightData(imageUrl: string): Promise<ArrayBuffer> {
  const apiKey = import.meta.env.VITE_BRIGHT_DATA_API_KEY;

  const response = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      zone: 'residential_proxy1',
      url: imageUrl,
      format: 'raw',
      response_type: 'binary'
    }),
  });

  return await response.arrayBuffer();
}
```

### Solution 4: Server-Side Scraper
**Problem**: Browser environment has too many limitations.

**Fix**: Move scraper to server-side (Node.js):
- Create API endpoint: `POST /api/scrape-shirts`
- Run scraper on backend where CORS doesn't apply
- Return results to frontend
- Add job queue for long-running scrapes

## Verification Steps

After implementing a fix:

1. **Test the failing URL again**
2. **Check browser console** - Should see detailed step-by-step logs
3. **Verify image upload** - Check Supabase Storage bucket
4. **Verify database insert** - Check shirts table
5. **Check final counts** - Should show correct success/failed/skipped numbers
6. **Test multiple URLs** - Ensure fix works consistently

## Next Steps

1. **Identify the exact error** using the enhanced logging
2. **Choose a solution** based on the error type:
   - CORS error → Use proxy or Bright Data for images
   - HTTP error → Check image URL parsing
   - Storage error → Check Supabase permissions
   - Database error → Check schema and constraints
3. **Implement the fix**
4. **Test thoroughly** with multiple URLs
5. **Update SCRAPER_README.md** with any changes

## Files Modified

1. **services/scraperBrowserService.ts**
   - Enhanced `uploadImageToStorage()` with detailed logging
   - Enhanced `processScrapedShirt()` with step-by-step logging
   - Added CORS error detection

2. **components/admin/ScraperPage.tsx**
   - Fixed final count reporting to use correct state values

## Additional Notes

### Environment Check
Ensure these are configured in `.env.local`:
```bash
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
BRIGHT_DATA_API_KEY=a1d8c...
BRIGHT_DATA_ZONE=residential_proxy1
```

### Supabase Storage Setup
Verify the `shirt-images` bucket exists and has:
- Public access enabled (for public URLs)
- Insert permissions for authenticated users
- File size limit sufficient for shirt images

### Browser Requirements
- Modern browser with Fetch API support
- JavaScript enabled
- No ad blockers interfering with API calls
- Console access for viewing logs

## Support

If you encounter issues:
1. Check browser console for detailed error logs
2. Verify all environment variables are set
3. Test with a simple URL first
4. Check Supabase dashboard for storage/database errors
5. Review this document for common solutions
