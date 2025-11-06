/**
 * Try to list available zones from Bright Data API
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

async function listZones() {
  const apiKey = process.env.BRIGHT_DATA_API_KEY;

  // Try different API endpoints that might list zones
  const endpoints = [
    'https://api.brightdata.com/zones',
    'https://api.brightdata.com/zone',
    'https://api.brightdata.com/account/zones',
    'https://api.brightdata.com/v1/zones',
    'https://api.brightdata.com/v2/zones',
  ];

  for (const endpoint of endpoints) {
    console.log(`\nTrying: ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      console.log('Status:', response.status);
      if (response.ok) {
        const data = await response.text();
        console.log('SUCCESS! Response:', data);
      } else {
        const error = await response.text();
        console.log('Error:', error.substring(0, 200));
      }
    } catch (error) {
      console.error('Request failed:', error instanceof Error ? error.message : error);
    }
  }
}

listZones();
