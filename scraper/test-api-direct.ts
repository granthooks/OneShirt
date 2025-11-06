/**
 * Direct API test to debug Bright Data configuration
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

async function testDirectAPI() {
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  console.log('API Key loaded:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT FOUND');

  // Test 1: Try without zone parameter
  console.log('\n Test 1: Request without zone parameter');
  try {
    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
        format: 'raw',
      }),
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.error('Error:', error);
  }

  // Test 2: Try with empty zone
  console.log('\n\nTest 2: Request with empty zone');
  try {
    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        zone: '',
        url: 'https://example.com',
        format: 'raw',
      }),
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.error('Error:', error);
  }

  // Test 3: Check if maybe it's a proxy-based approach
  console.log('\n\nTest 3: Trying proxy-based approach');
  console.log('Note: Bright Data might use proxy credentials instead of API endpoint');
  console.log('Format: brd-customer-<CUSTOMER_ID>-zone-<ZONE>:<PASSWORD>@brd.superproxy.io:33335');
}

testDirectAPI();
