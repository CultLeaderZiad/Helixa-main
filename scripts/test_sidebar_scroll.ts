import { chromium } from '@playwright/test';
import * as path from 'path';

const BASE_URL = 'https://helixa-main-ecru.vercel.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const ARTIFACT_DIR = 'C:/Users/ziad/.gemini/antigravity-ide/brain/c9c47862-b764-4a2b-b3c3-f6f2d00e8d0f';

async function run() {
  console.log('Starting sidebar layout test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 600 } // Constrained vertical height
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    console.log('Logging in...');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    console.log('Waiting for dashboard redirection...');
    await page.waitForURL('**/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait an extra second for dynamic components and animations to settle
    await page.waitForTimeout(2000);

    const initialScreenshotPath = path.join(ARTIFACT_DIR, 'sidebar_initial.png');
    await page.screenshot({ path: initialScreenshotPath });
    console.log(`Initial screenshot saved to: ${initialScreenshotPath}`);

    // Check if the sidebar navigation exists and scroll it
    const sidebarNav = page.locator('aside nav');
    const isVisible = await sidebarNav.isVisible();
    console.log(`Sidebar navigation found: ${isVisible}`);

    if (isVisible) {
      console.log('Scrolling sidebar to the bottom...');
      await sidebarNav.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      // Wait for scroll rendering
      await page.waitForTimeout(500);

      const scrolledScreenshotPath = path.join(ARTIFACT_DIR, 'sidebar_scrolled.png');
      await page.screenshot({ path: scrolledScreenshotPath });
      console.log(`Scrolled screenshot saved to: ${scrolledScreenshotPath}`);
    } else {
      console.error('Sidebar navigation was not found!');
    }

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await browser.close();
    console.log('Test completed.');
  }
}

run();
