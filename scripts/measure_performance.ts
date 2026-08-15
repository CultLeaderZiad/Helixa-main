import { chromium } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'https://helixa-main-ecru.vercel.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_USER_PASS = process.env.TEST_USER_PASS || '';

// Configuration
const ROUTES = [
  '/dashboard',
  '/dashboard/automations',
  '/dashboard/inbox',
  '/dashboard/ice-breakers',
  '/dashboard/analytics',
  '/dashboard/agents',
  '/dashboard/settings/connections',
  '/dashboard/billing',
  '/dashboard/admin'
];

async function measureNavigation(page: any, url: string) {
  let requestCount = 0;
  let jsTransferred = 0;
  let ttfb: number | null = null;
  
  // Setup listeners
  const onRequest = () => { requestCount++; };
  const onResponse = async (response: any) => {
    if (response.url() === url && !ttfb) {
      const timing = response.request().timing();
      if (timing) {
        ttfb = timing.responseStart;
      }
    }
    
    if (response.request().resourceType() === 'script') {
      try {
        const headers = await response.allHeaders();
        const length = parseInt(headers['content-length'] || '0', 10);
        jsTransferred += length;
      } catch (e) {
        // Ignore response reading errors
      }
    }
  };
  
  page.on('request', onRequest);
  page.on('response', onResponse);

  const startTime = Date.now();
  
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait for network idle to simulate visually complete
  await page.waitForLoadState('networkidle');
  const visuallyCompleteTime = Date.now() - startTime;

  // Cleanup listeners
  page.off('request', onRequest);
  page.off('response', onResponse);

  return {
    url,
    timeToFirstByte: ttfb || 0,
    visuallyComplete: visuallyCompleteTime,
    requests: requestCount,
    jsTransferredKB: (jsTransferred / 1024).toFixed(2)
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = [];

  try {
    console.log('--- Navigating unauthenticated main pages ---');
    // Navigate and scroll main pages as requested
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    console.log('--- Logging in ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Logged in successfully.');

    console.log('--- Measuring Dashboard Routes ---');
    for (const route of ROUTES) {
      const fullUrl = `${BASE_URL}${route}`;
      console.log(`Measuring ${route}...`);
      const metrics = await measureNavigation(page, fullUrl);
      results.push(metrics);
      // Wait a bit before next navigation to avoid overlapping metrics
      await page.waitForTimeout(2000);
    }
    
    console.log('\n--- Performance Results ---');
    // Sort by visuallyComplete time descending
    results.sort((a, b) => b.visuallyComplete - a.visuallyComplete);
    console.table(results);
    
    fs.writeFileSync('performance_results.json', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Error during measurement:', error);
  } finally {
    await browser.close();
  }
}

run();
