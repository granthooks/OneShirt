# Image Proxy Server

A backend proxy server that solves CORS issues when downloading images from external sources (e.g., Threadless) in the browser-based scraper.

## Problem

When the browser tries to download images directly from `images.threadless.com`, the request fails due to CORS (Cross-Origin Resource Sharing) restrictions. The browser blocks these requests for security reasons.

## Solution

This Express server acts as a proxy:
1. Browser requests image from proxy: `http://localhost:3100/api/proxy-image?url=<image_url>`
2. Proxy downloads image server-side (no CORS restrictions)
3. Proxy returns image to browser with proper CORS headers

## Setup

### Install Dependencies

Dependencies are already installed via the main package.json:
- `express` - Web server framework
- `cors` - CORS middleware
- `node-fetch` - Fetch API for Node.js

### Environment Variables

Optional:
- `IMAGE_PROXY_PORT` - Port to run the server on (default: 3100)
- `VITE_IMAGE_PROXY_URL` - Full URL to proxy server (default: http://localhost:3100)

## Usage

### Running the Server

**Option 1: Run proxy server only**
```bash
npm run server
```

**Option 2: Run frontend + proxy server together**
```bash
npm run dev:full
```

This uses `concurrently` to run both:
- Vite dev server on port 3000
- Image proxy server on port 3100

### API Endpoints

#### Health Check
```
GET http://localhost:3100/health
```

Response:
```json
{
  "status": "ok",
  "service": "image-proxy",
  "timestamp": "2025-11-06T20:00:00.000Z"
}
```

#### Proxy Image
```
GET http://localhost:3100/api/proxy-image?url=<encoded_image_url>
```

Parameters:
- `url` - The full URL of the image to download (URL-encoded)

Example:
```bash
curl "http://localhost:3100/api/proxy-image?url=https://picsum.photos/200/300"
```

Response:
- Success (200): Raw image buffer with appropriate Content-Type
- Error (4xx/5xx): JSON error object

## Integration with Scraper

The scraper service (`services/scraperBrowserService.ts`) automatically uses the proxy:

```typescript
// Automatically proxies the request through the backend
const proxyUrl = `${VITE_IMAGE_PROXY_URL}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
const response = await fetch(proxyUrl);
```

If the proxy server is not running, the scraper will:
1. Try the proxy first
2. If proxy fails, attempt direct fetch as fallback
3. If both fail, throw error with helpful message

## Security Notes

### Development Mode
- `rejectUnauthorized: false` is enabled to handle SSL certificate issues in development
- CORS is enabled for all origins (`*`)

### Production Recommendations
1. Remove `rejectUnauthorized: false` or use proper SSL certificates
2. Restrict CORS to specific origins:
   ```javascript
   app.use(cors({
     origin: 'https://yourdomain.com'
   }))
   ```
3. Add rate limiting to prevent abuse
4. Add request validation and sanitization
5. Consider using a proper CDN or image hosting service

## Testing

### Test Health Endpoint
```bash
curl http://localhost:3100/health
```

### Test Image Proxy
```bash
# Download test image
curl "http://localhost:3100/api/proxy-image?url=https://picsum.photos/200/300" --output test.jpg

# Verify it's an image
file test.jpg
# Output: test.jpg: JPEG image data...
```

### Test with Browser
Open browser console and run:
```javascript
fetch('http://localhost:3100/api/proxy-image?url=https://picsum.photos/200/300')
  .then(r => r.blob())
  .then(blob => console.log('Downloaded:', blob.size, 'bytes'))
```

## Troubleshooting

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3100
```

Solution: Kill existing process or change port
```bash
# Find process using port 3100
lsof -i :3100

# Kill process
kill -9 <PID>

# Or use different port
IMAGE_PROXY_PORT=3101 npm run server
```

### SSL Certificate Errors
The proxy includes `rejectUnauthorized: false` to handle SSL issues in development. If you see certificate errors:
1. This is normal in development environments
2. The proxy will still work
3. For production, use proper SSL certificates

### 404 Errors on Image URLs
If the proxy returns 404:
1. Verify the image URL exists by testing in a browser
2. Check if the image URL requires authentication
3. Verify the URL is properly encoded

### Proxy Server Not Starting
1. Check if dependencies are installed: `npm install`
2. Check for syntax errors in `server/imageProxy.js`
3. Try running with verbose logging: `DEBUG=* npm run server`

## Architecture

```
┌─────────────────┐
│  Browser        │
│  (Admin UI)     │
└────────┬────────┘
         │ fetch() - CORS blocked!
         │
         ↓
┌─────────────────────────┐
│  Image Proxy Server     │
│  (Node.js/Express)      │
│  Port: 3100             │
└────────┬────────────────┘
         │ https.get() - No CORS!
         │
         ↓
┌──────────────────────────┐
│  External Image Server   │
│  (e.g., Threadless)      │
└──────────────────────────┘
```

## Files

- `server/imageProxy.js` - Main proxy server
- `server/README.md` - This documentation
- `package.json` - Contains `server` and `dev:full` scripts
- `services/scraperBrowserService.ts` - Consumes the proxy API

## Future Enhancements

Potential improvements:
1. Image caching (Redis or file system)
2. Image optimization (resize, compress)
3. Request rate limiting
4. Authentication/API keys
5. Logging and monitoring
6. Image format conversion
7. Batch image downloads
8. Progress tracking for large images
