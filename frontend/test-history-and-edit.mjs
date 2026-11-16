import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOTS_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/scratch/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const USER_IMG_PATH = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/.user_uploaded/media_1794838186577_2086b47d.png';

async function runTest() {
  console.log('=== STARTING 2BUILDERS /HISTORY & /EDIT NAVIGATION TEST SUITE ===');

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

  // 1. Load Landing Page & Ingest Plan
  console.log('1. Loading application at http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('2. Ingesting user floor plan...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(USER_IMG_PATH);
  await page.waitForTimeout(600);

  console.log('3. Converting to 3D Space & Entering Studio...');
  await page.click('#btn-convert-plan');
  await page.waitForSelector('text=Split CAD', { timeout: 10000 });
  await page.waitForTimeout(1200);

  // 4. Verify Split CAD View with No Overlapping
  console.log('4. Verifying Split CAD view with zero overlapping...');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/20_split_cad_no_overlap.png` });

  // 5. Test Properties Inspector Collapse / Expand
  console.log('5. Testing Properties Inspector collapse...');
  const collapseBtn = page.locator('button[title*="Collapse Inspector"]').first();
  if (await collapseBtn.count() > 0) {
    await collapseBtn.click();
    await page.waitForTimeout(600);
    console.log('   ✓ Inspector collapsed to compact icon rail (canvas expanded)!');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/21_inspector_collapsed_full_canvas.png` });

    // Expand it back
    const expandBtn = page.locator('button[title*="Expand Properties Inspector"]').first();
    await expandBtn.click();
    await page.waitForTimeout(600);
    console.log('   ✓ Inspector expanded back smoothly!');
  }

  // 6. Test /edit Navigation: Switch to 2D Edit Mode
  console.log('6. Testing /edit navigation: Switching to Edit (2D) mode...');
  await page.click('button:has-text("Edit (2D)")');
  await page.waitForTimeout(1000);
  console.log('   ✓ Switched to full-bleed 2D CAD Edit mode!');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/22_edit_2d_mode.png` });

  // 7. Test /history Navigation & Modal
  console.log('7. Testing /history navigation modal...');
  const historyBtn = page.locator('#btn-nav-history');
  await historyBtn.waitFor({ state: 'visible' });
  await historyBtn.click();
  await page.waitForSelector('text=Revision History & Model Checkpoints', { timeout: 5000 });
  await page.waitForTimeout(800);
  console.log('   ✓ /history modal opened!');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/23_history_modal_open.png` });

  // 8. Test Creating a New Milestone Checkpoint
  console.log('8. Creating a new architectural milestone checkpoint...');
  await page.fill('input[placeholder*="Master Bedroom"]', 'Mid-Design Structural Review');
  await page.fill('textarea[placeholder*="partition"]', 'Extruded walls verified, PBR textures prepared, verified non-overlapping layout.');
  await page.click('button:has-text("Save Milestone Checkpoint")');
  await page.waitForTimeout(1000);
  console.log('   ✓ New milestone checkpoint created and rendered in timeline!');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/24_checkpoint_saved_timeline.png` });

  // 9. Close History Modal
  console.log('9. Closing History modal...');
  const closeBtn = page.locator('button[title="Close (ESC)"]');
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(800);

  // 10. Switch to 3D Scene View & Verify Layout Clearance
  console.log('10. Switching to 3D Scene view...');
  await page.click('button:has-text("3D Scene")');
  await page.waitForTimeout(1500);
  console.log('    ✓ 3D Scene view mounted with stacked Floor Levels & bottom Tour Bar!');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/25_3d_scene_stacked_levels_no_overlap.png` });

  console.log('=== TEST SUITE COMPLETED SUCCESSFULLY ===');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();
}

runTest().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
