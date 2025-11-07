# Quick Test Guide - Enhanced Scraper Logging

## 🚀 Quick Start

### 1. Start the App
```bash
npm run dev
```

### 2. Open Browser
Navigate to: http://localhost:3005 (or displayed port)

### 3. Access Scraper
1. Log in as admin
2. Click "Admin" button
3. Click "Import Shirts"

### 4. Open DevTools
Press **F12** → Go to **Console** tab

### 5. Test URL
Paste this failing URL:
```
https://www.threadless.com/shop/@alfbocreative/design/double-oscar/mens/t-shirt/regular?color=smoke&variation=front#m
```

### 6. Run Test
Click "Start Scraping" and watch console

---

## 📋 What You Should See

### ✅ Expected Console Output

```javascript
[Process] Starting processing for: "DOUBLE OSCAR"
[Process] Image URL: https://images.threadless.com/products/...
[Process] Designer: alfbocreative
[Process] Step 1: Uploading image to storage...
[Storage] Downloading image from: https://images.threadless.com/...
[Storage] ERROR downloading/uploading image: TypeError: Failed to fetch
[Process] ERROR: <full error object>
[Process] Error message: CORS Error: Cannot download image from...
```

### ✅ Expected Activity Log

```
[11:38:22 AM] ✓ Scraped: "DOUBLE OSCAR" by alfbocreative
[11:38:22 AM] • Processing: "DOUBLE OSCAR"...
[11:38:23 AM] ✗ Failed to process: CORS Error: Cannot download image...
[11:38:23 AM] ✓ Scraping complete! Success: 0, Failed: 1, Skipped: 0
```

### ✅ Key Improvements
- ✓ Detailed step-by-step logging
- ✓ Specific CORS error identified
- ✓ Image URL shown in logs
- ✓ Correct final counts (Failed: 1, not 0)

---

## 🔍 What to Look For

### Console Logs Prefixes
- `[Process]` - Processing flow logs
- `[Storage]` - Image download/upload logs
- `[DB]` - Database operation logs
- `[Parser]` - HTML parsing logs
- `[Bright Data]` - API fetch logs

### Error Details
- Full error object (not just message)
- Error stack trace
- Specific CORS error detection
- Image URL that failed

### Count Accuracy
- Final log should show: `Failed: 1` (not `Failed: 0`)
- Counts should match results section

---

## 🐛 Troubleshooting

### If logs don't appear:
- Check DevTools Console is open
- Verify no console filters are active
- Try clearing browser cache

### If CORS error doesn't appear:
- Error might be different (HTTP 403, etc.)
- Check exact error message
- Review full error object

### If counts still show 0:
- Check browser console for React errors
- Try refreshing the page
- Verify you're on the latest code

---

## 📝 What to Report

After testing, report:
1. ✅/❌ Detailed logs appeared in console
2. ✅/❌ CORS error was identified
3. ✅/❌ Final counts were correct
4. 📋 Full console output (copy/paste)
5. 🔍 Any unexpected behavior

---

## 🎯 Next Steps

Once CORS is confirmed:
1. Implement backend image proxy (recommended)
2. Or choose alternative solution
3. Test fix with multiple URLs
4. Update documentation

---

## 📚 Related Docs

- **SCRAPER_FIX_SUMMARY.md** - Complete fix details
- **SCRAPER_DEBUGGING.md** - Full debugging guide
- **SCRAPER_README.md** - Original documentation

---

**Quick Test Time:** ~2 minutes
**Status:** Ready to test ✅
