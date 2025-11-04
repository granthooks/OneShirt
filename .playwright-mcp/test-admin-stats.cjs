const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  const resultsDir = path.join(__dirname, 'admin-test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push('CONSOLE ERROR: ' + msg.text());
    }
  });
  
  try {
    console.log('1. Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('2. Taking initial screenshot');
    await page.screenshot({ 
      path: path.join(resultsDir, '01-homepage.png'),
      fullPage: true 
    });
    
    console.log('3. Pressing Shift+A to open admin dashboard');
    await page.keyboard.down('Shift');
    await page.keyboard.press('A');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(2000);
    
    console.log('4. Taking admin dashboard screenshot');
    await page.screenshot({ 
      path: path.join(resultsDir, '02-admin-dashboard.png'),
      fullPage: true 
    });
    
    console.log('5. Extracting stat card values');
    const stats = await page.evaluate(() => {
      const results = {
        shirts: null,
        users: null,
        bidsToday: null,
        revenue: null,
        errors: [],
        pageText: document.body.innerText
      };
      
      const allText = document.body.innerText;
      
      const shirtMatch = allText.match(/Total Shirts[\s\S]*?(\d+)/i) || allText.match(/Shirts[\s\S]*?(\d+)/i);
      const userMatch = allText.match(/Total Users[\s\S]*?(\d+)/i) || allText.match(/Users[\s\S]*?(\d+)/i);
      const bidsMatch = allText.match(/Bids Today[\s\S]*?(\d+)/i);
      const revenueMatch = allText.match(/Revenue[\s\S]*?(\d+)/i);
      
      if (shirtMatch) results.shirts = shirtMatch[1];
      if (userMatch) results.users = userMatch[1];
      if (bidsMatch) results.bidsToday = bidsMatch[1];
      if (revenueMatch) results.revenue = revenueMatch[1];
      
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
      errorElements.forEach(el => {
        if (el.textContent) results.errors.push(el.textContent);
      });
      
      return results;
    });
    
    console.log('Extracted stats:', JSON.stringify(stats, null, 2));
    
    console.log('6. Checking for sections');
    const pageContent = await page.content();
    const hasRecentActivity = pageContent.includes('Recent Activity') || pageContent.includes('recent-activity');
    const hasPopularShirts = pageContent.includes('Popular Shirts') || pageContent.includes('popular-shirts');
    const hasTopUsers = pageContent.includes('Top Users') || pageContent.includes('top-users');
    
    console.log('Section checks:');
    console.log('  Recent Activity:', hasRecentActivity);
    console.log('  Popular Shirts:', hasPopularShirts);
    console.log('  Top Users:', hasTopUsers);
    
    console.log('7. Taking final screenshot');
    await page.screenshot({ 
      path: path.join(resultsDir, '03-final-state.png'),
      fullPage: true 
    });
    
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      sections: {
        recentActivity: hasRecentActivity,
        popularShirts: hasPopularShirts,
        topUsers: hasTopUsers
      },
      consoleErrors: consoleMessages,
      screenshots: [
        '01-homepage.png',
        '02-admin-dashboard.png',
        '03-final-state.png'
      ]
    };
    
    fs.writeFileSync(
      path.join(resultsDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Screenshots saved to:', resultsDir);
    console.log('Report saved to:', path.join(resultsDir, 'test-report.json'));
    
  } catch (error) {
    console.error('Test failed with error:', error);
    await page.screenshot({ 
      path: path.join(resultsDir, 'error-screenshot.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
})();
