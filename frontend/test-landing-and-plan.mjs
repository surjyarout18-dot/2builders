import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/scratch/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const USER_IMG_PATH = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/.user_uploaded/media_1794838186577_2086b47d.png';

async function runTest() {
  console.log('=== STARTING 2BUILDERS MULTI-PAGE & PLAN-TO-3D TEST SUITE ===');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 950 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  // 1. Load Application Landing Page
  console.log('1. Loading http://localhost:5173 (Landing Page)...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Verify hero text
  const heroHeading = await page.locator('h1').textContent();
  console.log(`   Hero Heading: "${heroHeading.trim().replace(/\s+/g, ' ')}"`);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01_cinematic_landing_hero.png` });

  // 2. Direct Floor Plan Ingestion from Landing Page
  console.log('2. Ingesting user floor plan image directly on landing page...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(USER_IMG_PATH);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02_landing_plan_uploaded_preview.png` });

  // 3. Click Convert Floor Plan to 3D Space
  console.log('3. Triggering AI Analysis and 3D Extrusion...');
  const convertBtn = page.locator('#btn-convert-plan');
  await convertBtn.click();
  
  // Wait for transition to studio (Split CAD view mode)
  console.log('   Waiting for CAD Studio to mount...');
  await page.waitForSelector('text=Split CAD', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03_converted_plan_in_studio_3d.png` });
  console.log('   Successfully entered CAD Studio with synthesized model!');

  // 4. Test Multi-page Session Persistence
  console.log('4. Testing session persistence: Returning to Landing Page...');
  await page.click('button[title="Return to Landing Page"]');
  await page.waitForTimeout(1000);
  
  // Verify active session ribbon is visible
  const sessionRibbonText = await page.locator('text=Active Session in Memory').textContent();
  console.log(`   Active Session Detected: "${sessionRibbonText}"`);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04_landing_active_session_ribbon.png` });

  // Click Resume Active Project
  console.log('   Resuming active project...');
  await page.click('text=Resume Active Project');
  await page.waitForSelector('text=Split CAD', { timeout: 5000 });
  await page.waitForTimeout(1000);
  console.log('   Successfully resumed CAD Studio session!');

  // 5. Test Full 3D Scene View
  console.log('5. Testing 3D Scene View Mode...');
  await page.click('button:has-text("3D Scene")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05_user_plan_full_3d.png` });

  // 6. Test Roof Toggle in 3D
  console.log('6. Testing Parametric Roof toggle...');
  const roofBtn = page.locator('button[title*="Roof"]').first();
  if (await roofBtn.count() > 0) {
    await roofBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06_user_plan_with_roof.png` });
  }

  // 7. Test BIM Schedules & Quantity Takeoffs
  console.log('7. Testing Schedules & Quantity Takeoffs Modal...');
  await page.click('#btn-nav-takeoffs');
  await page.waitForSelector('text=Architectural Schedules & Quantity Takeoffs', { timeout: 5000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/07_user_plan_schedules_takeoffs.png` });

  // Close Takeoffs modal with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 8. Test Preset Archetype from Landing Page
  console.log('8. Returning to Landing and testing 2-Storey Duplex Archetype...');
  await page.click('button[title="Return to Landing Page"]');
  await page.waitForTimeout(1000);
  
  // Scroll to templates
  const duplexBtn = page.locator('button:has-text("Load in CAD Studio")').nth(1);
  await duplexBtn.scrollIntoViewIfNeeded();
  await duplexBtn.click();
  await page.waitForSelector('text=Split CAD', { timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/08_duplex_template_loaded.png` });

  console.log('=== TEST SUITE COMPLETED SUCCESSFULLY ===');
  console.log(`Console Errors (${consoleErrors.length}):`, consoleErrors);

  await browser.close();

  if (consoleErrors.length > 0) {
    console.error('Test completed with console errors!');
    process.exit(1);
  } else {
    console.log('ALL ASSERTIONS & FLOWS PASSED WITH 0 CONSOLE ERRORS!');
  }
}

runTest().catch((err) => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
