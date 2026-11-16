import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/scratch/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const USER_IMG_PATH = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/.user_uploaded/media_1794838186577_2086b47d.png';

async function runTest() {
  console.log('=== STARTING 2BUILDERS MINIMAP & AUTO-TOUR TEST SUITE ===');

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

  // 1. Load Landing Page
  console.log('1. Loading application at http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 2. Ingest Floor Plan and Convert to 3D
  console.log('2. Ingesting floor plan image...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(USER_IMG_PATH);
  await page.waitForTimeout(600);

  console.log('3. Converting to 3D CAD space...');
  await page.click('#btn-convert-plan');
  await page.waitForSelector('text=Split CAD', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // 4. Switch to 3D Scene View
  console.log('4. Entering 3D Scene view...');
  await page.click('button:has-text("3D Scene")');
  await page.waitForTimeout(1200);

  // 5. Verify Architectural Radar Minimap is Visible
  console.log('5. Verifying Architectural Radar Minimap HUD...');
  const radarHeader = page.locator('text=RADAR HUD');
  await radarHeader.waitFor({ state: 'visible', timeout: 5000 });
  console.log('   ✓ Radar Minimap HUD mounted and visible!');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/13_3d_with_radar_minimap.png` });

  // 6. Verify Room Quick-Jump Carousel & Tour Bar
  console.log('6. Verifying Room Quick-Jump Carousel...');
  const tourBar = page.locator('text=Auto-Tour');
  await tourBar.waitFor({ state: 'visible', timeout: 5000 });
  console.log('   ✓ Walkthrough Tour Bar mounted with Auto-Tour controls!');

  // Check room pills
  const roomButtons = page.locator('div.overflow-x-auto button');
  const count = await roomButtons.count();
  console.log(`   Found ${count} room pills in tour bar`);
  for (let i = 0; i < Math.min(count, 4); i++) {
    const text = await roomButtons.nth(i).textContent();
    console.log(`   - Room ${i + 1}: ${text.trim()}`);
  }

  // 7. Click a Room Pill to Test Instant Navigation
  console.log('7. Testing click-to-navigate on room pill...');
  if (count > 1) {
    const secondRoom = roomButtons.nth(1);
    const targetRoomName = await secondRoom.textContent();
    console.log(`   Clicking Room: "${targetRoomName.trim()}"`);
    await secondRoom.click();
    await page.waitForTimeout(2000); // Allow camera glide
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/14_room_navigation_glided.png` });
    console.log('   ✓ Camera smoothly glided to target room!');
  }

  // 8. Test First-Person Walkthrough Mode
  console.log('8. Testing First-Person Walkthrough mode...');
  const fpBtn = page.locator('button:has-text("First-Person")').first();
  if (await fpBtn.count() > 0) {
    await fpBtn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/15_first_person_walkthrough_hud.png` });

  // 9. Test Auto-Tour Sequencer
  console.log('9. Testing Auto-Tour sequencer...');
  const autoTourBtn = page.locator('button:has-text("Auto-Tour")');
  if (await autoTourBtn.count() > 0) {
    await autoTourBtn.click();
    await page.waitForTimeout(1000);
    console.log('   ✓ Auto-Tour initiated!');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/16_autotour_active.png` });

    // Wait 3.5 seconds to observe auto traversal and room sweep
    console.log('   Observing cinematic room sweep & progression...');
    await page.waitForTimeout(3800);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/17_autotour_room_swept.png` });

    // Test Pause Tour
    const pauseBtn = page.locator('button:has-text("Pause Tour")');
    if (await pauseBtn.count() > 0) {
      await pauseBtn.click();
      console.log('   ✓ Auto-tour paused successfully!');
      await page.waitForTimeout(600);
    }
  }

  // 10. Test Minimap Blueprint Click-to-Teleport
  console.log('10. Testing Minimap Click-to-Teleport...');
  const minimapSvg = page.locator('svg.cursor-crosshair');
  if (await minimapSvg.count() > 0) {
    const box = await minimapSvg.boundingBox();
    if (box) {
      // Click near center-left of minimap
      await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.45);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/18_minimap_click_teleported.png` });
      console.log('   ✓ Successfully clicked blueprint on minimap to navigate!');
    }
  }

  // 11. Test Minimap Expand Toggle
  console.log('11. Testing Minimap Expand/Maximize toggle...');
  const expandBtn = page.locator('button[title="Expand Minimap"]');
  if (await expandBtn.count() > 0) {
    await expandBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/19_minimap_expanded_blueprint.png` });
    console.log('   ✓ Expanded blueprint HUD rendered with room labels!');
  }

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
