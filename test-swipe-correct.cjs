const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newContext();
  const context = await page.newPage();

  const swipeLogs = [];
  context.on('console', msg => {
    const text = msg.text();
    if (text.includes('handleButtonSwipe') || text.includes('exitDirection:') || text.includes('exitVariant determined:')) {
      swipeLogs.push(text);
      console.log('*** ' + text);
    }
  });

  console.log('1. Navigating to http://localhost:3000...');
  await context.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await context.waitForTimeout(3000);

  console.log('2. Taking initial screenshot...');
  await context.screenshot({ path: 'correct-test-initial.png', fullPage: true });

  // Find the reject button (X with red color) by looking for the specific SVG path
  console.log('\n3. Testing LEFT SWIPE (X button - reject)...');
  const rejectButton = context.locator('button:has(svg path[d*="M6 18L18 6M6 6l12 12"])');
  const rejectCount = await rejectButton.count();
  console.log(`Found ${rejectCount} reject button(s)`);

  if (rejectCount > 0) {
    console.log('Clicking reject button...');
    await rejectButton.first().click();
    await context.waitForTimeout(800);
    console.log('Taking left-swipe screenshot...');
    await context.screenshot({ path: 'correct-test-left-swipe.png', fullPage: true });
    await context.waitForTimeout(2500);
  }

  // Find the accept button (checkmark with green color)
  console.log('\n4. Testing RIGHT SWIPE (checkmark button - accept)...');
  const acceptButton = context.locator('button:has(svg path[d*="M5 13l4 4L19 7"])');
  const acceptCount = await acceptButton.count();
  console.log(`Found ${acceptCount} accept button(s)`);

  if (acceptCount > 0) {
    console.log('Clicking accept button...');
    await acceptButton.first().click();
    await context.waitForTimeout(800);
    console.log('Taking right-swipe screenshot...');
    await context.screenshot({ path: 'correct-test-right-swipe.png', fullPage: true });
    await context.waitForTimeout(2500);
  }

  console.log('\n=== SWIPE CONSOLE LOGS ===');
  swipeLogs.forEach(log => console.log(log));

  await browser.close();
  console.log('\nTest complete!');
})();
