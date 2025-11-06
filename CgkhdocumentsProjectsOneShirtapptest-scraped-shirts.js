const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('Taking screenshot of initial state...');
    await page.screenshot({ path: 'C:\gkh\documents\Projects\OneShirt\app\test-screenshots\initial-state.png', fullPage: true });
    
    console.log('2. Checking for swipe cards...');
    const swipeCards = await page.locator('[class*="swipe"]').count();
    console.log(`Found ${swipeCards} swipe card elements`);
    
    // Check for shirt titles
    const titleElements = await page.locator('h1, h2, h3, [class*="title"]').allTextContents();
    console.log('Title elements found:', titleElements);
    
    // Check for images
    const images = await page.locator('img').count();
    console.log(`Found ${images} images on page`);
    
    // Take screenshot showing current card
    await page.screenshot({ path: 'C:\gkh\documents\Projects\OneShirt\app\test-screenshots\current-card.png' });
    
    console.log('3. Attempting to access admin dashboard (Shift+A)...');
    await page.keyboard.press('Shift+KeyA');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:\gkh\documents\Projects\OneShirt\app\test-screenshots\after-shift-a.png', fullPage: true });
    
    // Check if admin panel appeared
    const adminText = await page.textContent('body');
    if (adminText.includes('Admin') || adminText.includes('Inventory')) {
      console.log('Admin panel opened successfully');
      
      // Try to navigate to inventory
      const inventoryLink = page.locator('text=Inventory');
      if (await inventoryLink.count() > 0) {
        console.log('Clicking Inventory link...');
        await inventoryLink.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'C:\gkh\documents\Projects\OneShirt\app\test-screenshots\inventory-page.png', fullPage: true });
        
        // Search for scraped shirts
        const searchBox = page.locator('input[type="text"], input[placeholder*="search" i]');
        if (await searchBox.count() > 0) {
          console.log('Searching for "Reset Restart"...');
          await searchBox.first().fill('Reset Restart');
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'C:\gkh\documents\Projects\OneShirt\app\test-screenshots\search-reset.png', fullPage: true });
        }
      }
    } else {
      console.log('Admin panel did not appear - user may not have admin access');
    }
    
    console.log('All tests completed successfully!');
    
  } catch (error) {
    console.error('Error during testing:', error);
    await page.screenshot({ path: 'C:\gkh\documents\Projects\OneShirt\app\test-screenshots\error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
