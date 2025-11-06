/**
 * Test script for Jina AI Reader service
 */

import { fetchUrlWithJina, testJinaService, extractLinksFromMarkdown, extractImagesFromMarkdown } from './services/jinaService';
import { buildThreadlessUrl } from './services/threadlessService';
import { validateConfig } from './config';

async function main() {
  console.log('='.repeat(60));
  console.log('Jina AI Reader Service Test');
  console.log('='.repeat(60));

  // Check configuration
  console.log('\n1. Validating configuration...');
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    console.error('Configuration errors:');
    configValidation.errors.forEach(err => console.error(`  - ${err}`));
    console.log('\nNote: Jina Reader works without API key, but has lower rate limits.');
  } else {
    console.log('Configuration is valid!');
  }

  // Test basic Jina service
  console.log('\n2. Testing Jina service with example.com...');
  const testPassed = await testJinaService();
  if (!testPassed) {
    console.error('Jina service test failed!');
    return;
  }

  // Build a Threadless URL
  console.log('\n3. Building Threadless URL...');
  const threadlessUrl = buildThreadlessUrl({
    genderFilter: 'mens',
    sortBy: 'popular'
  });
  console.log(`Built URL: ${threadlessUrl}`);

  // Fetch Threadless page with Jina
  console.log('\n4. Fetching Threadless page with Jina...');
  const result = await fetchUrlWithJina(threadlessUrl);

  if (result.error) {
    console.error('Error fetching page:', result.error);
    return;
  }

  console.log(`Success! Received ${result.content.length} characters`);
  console.log(`Page title: ${result.title || 'N/A'}`);

  // Extract links
  console.log('\n5. Extracting links from markdown...');
  const links = extractLinksFromMarkdown(result.content);
  console.log(`Found ${links.length} links`);
  console.log('First 10 links:');
  links.slice(0, 10).forEach((link, i) => {
    console.log(`  ${i + 1}. ${link}`);
  });

  // Extract images
  console.log('\n6. Extracting images from markdown...');
  const images = extractImagesFromMarkdown(result.content);
  console.log(`Found ${images.length} images`);
  console.log('First 5 images:');
  images.slice(0, 5).forEach((img, i) => {
    console.log(`  ${i + 1}. ${img.alt || 'No alt text'}`);
    console.log(`     ${img.url}`);
  });

  // Save a sample of the content
  console.log('\n7. Sample of markdown content:');
  console.log('-'.repeat(60));
  console.log(result.content.substring(0, 1000));
  console.log('-'.repeat(60));
  console.log(`... (${result.content.length - 1000} more characters)`);

  console.log('\n' + '='.repeat(60));
  console.log('Test completed successfully!');
  console.log('='.repeat(60));
}

// Run the test
main().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
