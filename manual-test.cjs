const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(msg.text());
    console.log('CONSOLE:', msg.text());
  });

  console.log('1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  console.log('2. Waiting for page to load...');
  await page.waitForTimeout(3000);

  console.log('3. Taking initial screenshot...');
  await page.screenshot({ path: 'manual-initial.png', fullPage: true });

  console.log('4. Looking for X button...');
  const xButton = page.locator('button').filter({ hasText: '✕' });
  const xCount = await xButton.count();
  console.log(`Found ${xCount} X buttons`);

  if (xCount > 0) {
    console.log('5. Clicking X button (LEFT swipe)...');
    await xButton.first().click();
    await page.waitForTimeout(500);
    
    console.log('6. Taking left-swipe screenshot...');
    await page.screenshot({ path: 'manual-left-swipe.png', fullPage: true });
    
    await page.waitForTimeout(2500);
  }

  console.log('7. Looking for checkmark button...');
  const checkButton = page.locator('button').filter({ hasText: '✓' });
  const checkCount = await checkButton.count();
  console.log(`Found ${checkCount} checkmark buttons`);

  if (checkCount > 0) {
    console.log('8. Clicking checkmark button (RIGHT swipe)...');
    await checkButton.first().click();
    await page.waitForTimeout(500);
    
    console.log('9. Taking right-swipe screenshot...');
    await page.screenshot({ path: 'manual-right-swipe.png', fullPage: true });
    
    await page.waitForTimeout(2500);
  }

  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(msg => console.log(msg));

  await browser.close();
  console.log('\nTest complete!');
})();
