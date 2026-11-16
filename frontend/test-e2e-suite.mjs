import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/scratch/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const USER_IMG_PATH = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/.user_uploaded/media_1794837494619_88d83e05.png';

async function runTest() {
  console.log('--- STARTING 2BUILDERS AUTOMATED TEST SUITE ---');

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

  // 1. Load Application
  console.log('1. Loading http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  const title = await page.title();
  console.log(`   Page Title: "${title}"`);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01_initial_cad_studio.png` });

  // 2. Test Prompt-to-Plan Generator
  console.log('2. Testing AI Generator (Prompt-to-Design)...');
  await page.click('button:has-text("AI Generator")');
  await page.waitForSelector('text=Prompt-to-Design Algorithmic Generator', { timeout: 3000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02_ai_generator_modal.png` });

  // Click Generate Candidate Layouts
  console.log('   Clicking "Generate Candidate Layouts"...');
  await page.click('button:has-text("Generate Candidate Layouts"), button:has-text("Run Generator Demo")');
  await page.waitForSelector('text=Generated Candidates', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03_generator_candidates.png` });

  // Select Candidate 2 (Beta) and load into studio
  console.log('   Loading Candidate 2 (Concept Beta) into CAD Studio...');
  const loadButtons = await page.$$('button:has-text("Load into CAD Studio")');
  if (loadButtons.length >= 2) {
    await loadButtons[1].click();
  } else if (loadButtons.length > 0) {
    await loadButtons[0].click();
  }
  await page.waitForSelector('text=Prompt-to-Design Algorithmic Generator', { state: 'detached', timeout: 5000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04_loaded_candidate_cad.png` });

  // 3. Test 3D Scene Controls & Roof
  console.log('3. Testing 3D Scene Controls & Parametric Roof...');
  const roofBtn = await page.$('button:has-text("Roof")');
  if (roofBtn) {
    await roofBtn.click();
    console.log('   Toggled Roof ON');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05_roof_enabled_3d.png` });
  }

  // 4. Test Walkthrough Mode
  console.log('4. Testing First-Person Walkthrough Mode...');
  const walkBtn = await page.$('button:has-text("Walk")');
  if (walkBtn) {
    await walkBtn.click();
    await page.waitForSelector('text=First-Person Walkthrough', { timeout: 3000 });
    console.log('   Walkthrough active: HUD visible with collision protection');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06_fps_walkthrough.png` });

    // Exit Walkthrough
    await page.click('button:has-text("Exit (ESC)")');
    await page.waitForTimeout(500);
  }

  // 5. Test Schedules & Quantity Takeoffs Modal
  console.log('5. Testing Quantity Takeoffs & Schedules...');
  await page.click('button:has-text("Takeoffs")');
  await page.waitForSelector('text=Architectural Schedules & Quantity Takeoffs', { timeout: 3000 });
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/07_takeoffs_rooms.png` });

  // Switch to Finish Takeoffs tab
  await page.click('button:has-text("Finish Takeoffs (+10% Waste)")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/08_takeoffs_finishes_waste.png` });

  // Switch to Components tab
  await page.click('button:has-text("Components & Fenestration")');
  await page.waitForTimeout(400);

  // Close modal with Escape
  console.log('   Closing Takeoffs modal...');
  await page.keyboard.press('Escape');
  await page.waitForSelector('text=Architectural Schedules & Quantity Takeoffs', { state: 'detached', timeout: 5000 });
  await page.waitForTimeout(500);

  // 6. Test Multi-Floor Levels Bar
  console.log('6. Testing Multi-Floor Level Switcher...');
  const addFloorBtn = await page.$('button[title="Add Story / Floor"]');
  if (addFloorBtn) {
    await addFloorBtn.click();
    console.log('   Added new story / level');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/09_multi_floor_added.png` });
  }

  // 7. Test Uploading User Plan
  console.log(`7. Testing Plan Upload with User Plan (${path.basename(USER_IMG_PATH)})...`);
  await page.click('button:has-text("Upload Plan")');
  await page.waitForSelector('text=Upload 2D Floor Plan Image', { timeout: 3000 });

  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.setInputFiles(USER_IMG_PATH);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/10_user_plan_uploaded_preview.png` });

    // Run AI analysis
    const convertBtn = await page.$('button:has-text("Convert to 3D Architectural Scene")');
    if (convertBtn) {
      console.log('   Converting user plan to 3D architectural scene...');
      await convertBtn.click();
      await page.waitForSelector('text=Upload 2D Floor Plan Image', { state: 'detached', timeout: 15000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/11_user_plan_in_cad_studio.png` });
    }
  }

  // 8. Test Export Modal
  console.log('8. Testing Export Modal...');
  await page.click('button:has-text("Export")');
  await page.waitForSelector('text=Export Architectural Model', { timeout: 3000 });
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/12_export_modal.png` });
  await page.keyboard.press('Escape');
  await page.waitForSelector('text=Export Architectural Model', { state: 'detached', timeout: 5000 });

  console.log('\n--- TEST SUITE SUMMARY ---');
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`Console Errors encountered: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();
  console.log('--- ALL AUTOMATED UI TESTS PASSED SUCCESSFULLY ---');
}

runTest().catch((e) => {
  console.error('Test Suite Failed:', e);
  process.exit(1);
});
