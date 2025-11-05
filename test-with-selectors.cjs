const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (text.includes('handleButtonSwipe') || text.includes('exitDirection') || text.includes('exitVariant')) {
      console.log('*** SWIPE LOG:', text);
    }
  });

  console.log('1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('2. Taking initial screenshot...');
  await page.screenshot({ path: 'selector-test-initial.png', fullPage: true });

  // Try to find buttons by CSS class or other attributes
  console.log('3. Looking for buttons...');
  const allButtons = await page.locator('button').all();
  console.log(`Found ${allButtons.length} total buttons`);

  // Get button details
  for (let i = 0; i < allButtons.length; i++) {
    const text = await allButtons[i].textContent();
    const classes = await allButtons[i].getAttribute('class');
    console.log(`Button ${i}: text="${text}", classes="${classes}"`);
  }

  // Click the first button (should be X button based on visual order)
  if (allButtons.length >= 2) {
    console.log('\n4. Clicking first button (X - reject)...');
    await allButtons[0].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'selector-test-left.png', fullPage: true });
    await page.waitForTimeout(2500);

    console.log('\n5. Clicking second button (checkmark - accept)...');
    const newButtons = await page.locator('button').all();
    if (newButtons.length >= 2) {
      await newButtons[1].click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'selector-test-right.png', fullPage: true });
      await page.waitForTimeout(2500);
    }
  }

  console.log('\n=== RELEVANT CONSOLE MESSAGES ===');
  consoleMessages
    .filter(msg => msg.includes('handleButtonSwipe') || msg.includes('exitDirection') || msg.includes('exitVariant'))
    .forEach(msg => console.log(msg));

  await browser.close();
  console.log('\nTest complete!');
})();
