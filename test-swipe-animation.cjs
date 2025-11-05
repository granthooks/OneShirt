const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.text());
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  console.log('Taking initial screenshot...');
  await page.screenshot({ path: 'test-initial-state.png', fullPage: true });

  // Test LEFT swipe (X button)
  console.log('\n=== TESTING LEFT SWIPE (X button) ===');
  const xButton = await page.locator('button:has-text("✕")').first();
  
  console.log('Clicking X button...');
  await xButton.click();
  await page.waitForTimeout(1000);
  
  console.log('Taking left swipe screenshot...');
  await page.screenshot({ path: 'test-left-swipe.png', fullPage: true });
  await page.waitForTimeout(2000);

  // Test RIGHT swipe (checkmark button)
  console.log('\n=== TESTING RIGHT SWIPE (checkmark button) ===');
  const checkButton = await page.locator('button:has-text("✓")').first();
  
  console.log('Clicking checkmark button...');
  await checkButton.click();
  await page.waitForTimeout(1000);
  
  console.log('Taking right swipe screenshot...');
  await page.screenshot({ path: 'test-right-swipe.png', fullPage: true });
  await page.waitForTimeout(2000);

  console.log('\nTest complete! Screenshots saved.');
  await browser.close();
})();
