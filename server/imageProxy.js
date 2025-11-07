/**
 * Image Proxy Server
 *
 * Solves CORS issues when downloading images from external sources (e.g., Threadless)
 * by proxying the image requests through our backend server.
 *
 * Usage:
 *   GET /api/proxy-image?url=<encoded_image_url>
 *
 * Returns:
 *   - 200: Image buffer with appropriate Content-Type
 *   - 400: Missing or invalid URL parameter
 *   - 404: Image not found at source
 *   - 500: Server error
 */

import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';

const app = express();

// Enable CORS for all origins (adjust in production)
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'image-proxy', timestamp: new Date().toISOString() });
});

// Image proxy endpoint
app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;

  // Validate URL parameter
  if (!url) {
    return res.status(400).json({
      error: 'Missing url parameter',
      usage: '/api/proxy-image?url=<encoded_image_url>'
    });
  }

  // Decode URL (in case it's double-encoded)
  let imageUrl;
  try {
    imageUrl = typeof url === 'string' ? url : String(url);
    // Validate it's a proper URL
    new URL(imageUrl);
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid URL format',
      provided: url
    });
  }

  console.log(`[Proxy] Fetching image: ${imageUrl}`);

  try {
    // Parse the URL to determine protocol
    const urlObj = new URL(imageUrl);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    // Check environment variable for SSL validation (default: false for development)
    const ignoreSSLErrors = process.env.IGNORE_SSL_ERRORS !== 'false';

    // Fetch image using native http/https module
    const fetchImage = () => {
      return new Promise((resolve, reject) => {
        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.threadless.com/',
          },
          timeout: 30000, // 30 second timeout
          // Disable SSL certificate validation for CloudFront/CDN hostname mismatches
          // This is necessary because some services like Threadless use CloudFront CDN
          // which can cause ERR_TLS_CERT_ALTNAME_INVALID errors
          // WARNING: Only use in development. In production, set IGNORE_SSL_ERRORS=false
          rejectUnauthorized: !ignoreSSLErrors,
        };

        if (ignoreSSLErrors) {
          console.log('[Proxy] SSL certificate validation is DISABLED (development mode)');
        }

        const request = protocol.get(imageUrl, options, (response) => {
          // Handle redirects
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            console.log(`[Proxy] Following redirect to: ${response.headers.location}`);
            // Recursively handle redirect
            const redirectUrl = new URL(response.headers.location, imageUrl).href;
            const redirectProtocol = redirectUrl.startsWith('https:') ? https : http;
            // Ensure redirect also uses the same SSL settings
            redirectProtocol.get(redirectUrl, options, (redirectResponse) => {
              if (redirectResponse.statusCode !== 200) {
                reject(new Error(`HTTP ${redirectResponse.statusCode}: ${redirectResponse.statusMessage}`));
                return;
              }

              const chunks = [];
              redirectResponse.on('data', chunk => chunks.push(chunk));
              redirectResponse.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = redirectResponse.headers['content-type'] || 'image/jpeg';
                resolve({ buffer, contentType, statusCode: redirectResponse.statusCode });
              });
            }).on('error', reject);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }

          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const contentType = response.headers['content-type'] || 'image/jpeg';
            resolve({ buffer, contentType, statusCode: response.statusCode });
          });
        });

        request.on('error', reject);
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });
      });
    };

    const { buffer, contentType, statusCode } = await fetchImage();

    // Validate it's actually an image
    if (!contentType.startsWith('image/')) {
      console.error(`[Proxy] Invalid content type: ${contentType}`);
      return res.status(400).json({
        error: 'URL does not point to an image',
        contentType,
        url: imageUrl
      });
    }

    console.log(`[Proxy] Success: ${buffer.length} bytes, type: ${contentType}`);

    // Return image to client with appropriate headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*',
    });

    res.send(buffer);

  } catch (error) {
    console.error('[Proxy] Error:', error);
    console.error('[Proxy] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[Proxy] Error type:', error.constructor.name);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorType = error instanceof TypeError ? 'Network/Fetch Error' : 'Server Error';

    res.status(500).json({
      error: errorMessage,
      type: errorType,
      url: imageUrl,
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/proxy-image?url=<encoded_image_url>'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const PORT = process.env.IMAGE_PROXY_PORT || 3100;
const IGNORE_SSL_ERRORS = process.env.IGNORE_SSL_ERRORS !== 'false';

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`Image Proxy Server running on http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Proxy endpoint: http://localhost:${PORT}/api/proxy-image?url=<image_url>`);
  console.log('='.repeat(60));
  console.log(`SSL Certificate Validation: ${IGNORE_SSL_ERRORS ? 'DISABLED (dev mode)' : 'ENABLED (production)'}`);
  if (IGNORE_SSL_ERRORS) {
    console.log('WARNING: SSL errors are being ignored. Use IGNORE_SSL_ERRORS=false for production.');
  }
  console.log('='.repeat(60));
});
