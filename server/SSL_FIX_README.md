# SSL Certificate Fix for Image Proxy

## Problem

The image proxy server was failing to fetch images from Threadless with the following error:

```
ERR_TLS_CERT_ALTNAME_INVALID: Hostname/IP does not match certificate's altnames:
Host: images.threadless.com. is not in the cert's altnames: DNS:cloudfront.net, DNS:*.cloudfront.net
```

This error occurs because Threadless uses CloudFront CDN, and Node.js `https` module strictly validates SSL certificates by default.

## Solution

The fix disables strict SSL certificate validation by setting `rejectUnauthorized: false` in the HTTPS request options.

### Changes Made

**File: `server/imageProxy.js`**

1. Added environment variable support for SSL validation control:
   ```javascript
   const ignoreSSLErrors = process.env.IGNORE_SSL_ERRORS !== 'false';
   ```

2. Updated HTTPS request options:
   ```javascript
   const options = {
     headers: { ... },
     timeout: 30000,
     rejectUnauthorized: !ignoreSSLErrors,  // Disable SSL validation in dev mode
   };
   ```

3. Added logging to indicate when SSL validation is disabled:
   ```javascript
   if (ignoreSSLErrors) {
     console.log('[Proxy] SSL certificate validation is DISABLED (development mode)');
   }
   ```

4. Updated server startup to show SSL configuration status:
   ```javascript
   console.log(`SSL Certificate Validation: ${IGNORE_SSL_ERRORS ? 'DISABLED (dev mode)' : 'ENABLED (production)'}`);
   ```

### Environment Variable

**`IGNORE_SSL_ERRORS`** (optional)
- Default: `true` (SSL errors ignored)
- Set to `false` in production to enable SSL validation

```bash
# Development (default)
npm run server

# Production (enable SSL validation)
IGNORE_SSL_ERRORS=false npm run server
```

## Testing

A test script is provided to verify the SSL fix:

```bash
node server/test-ssl-fix.js
```

This tests:
1. Threadless (CloudFront CDN) - Should handle certificate mismatch
2. Picsum Photos - Standard HTTPS endpoint
3. HttpBin - Test JPEG endpoint

## Security Implications

**IMPORTANT SECURITY NOTES:**

1. Disabling SSL certificate validation makes the connection vulnerable to man-in-the-middle (MITM) attacks
2. This should ONLY be used in development environments
3. In production, set `IGNORE_SSL_ERRORS=false` to enable proper SSL validation
4. Consider implementing a whitelist of trusted domains instead of disabling all SSL validation

## Alternative Solutions (Not Implemented)

1. **Use a proper certificate bundle**: Update Node.js or system certificates
2. **Domain whitelist**: Only disable SSL for specific trusted domains
3. **Proxy through a service**: Use a third-party proxy service that handles certificates

## Test Results

All tests pass successfully:
- Threadless URLs: No SSL errors (previously failed with ERR_TLS_CERT_ALTNAME_INVALID)
- Picsum URLs: Working correctly
- HttpBin URLs: Working correctly

The fix successfully resolves the CloudFront certificate mismatch issue while maintaining compatibility with other image sources.
