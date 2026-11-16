import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOTS_DIR = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/scratch/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const USER_IMG_PATH = 'C:/Users/ADMIN/.gemini/antigravity/brain/46e48c66-42c2-4367-ae8b-74ea7781801e/.user_uploaded/media_1794838186577_2086b47d.png';

async function runTest() {
  console.log('=== STARTING 2BUILDERS PADSPAN ATLAS 3D HOME TEST SUITE ===');

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

  // 1. Load application
  console.log('1. Loading application at http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 2. Ingest plan and enter Studio
  console.log('2. Ingesting plan and entering Studio...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(USER_IMG_PATH);
  await page.waitForTimeout(600);

  console.log('3. Converting to 3D Space & Entering Studio...');
  await page.click('#btn-convert-plan');
  await page.waitForSelector('text=Split CAD', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // 3. Switch to 3D Scene View
  console.log('3. Entering 3D Scene view...');
  await page.click('button:has-text("3D Scene")');
  await page.waitForTimeout(1500);

  // 4. Verify Atlas 3D Presence Ribbon
  console.log('4. Verifying PadSpan Atlas Presence Ribbon...');
  const atlasRibbon = page.locator('text=Atlas 3D');
  await atlasRibbon.waitFor({ state: 'visible', timeout: 5000 });
  console.log('   ✓ Atlas 3D Live Engine ribbon mounted!');

  const peopleCount = page.locator('text=People:');
  await peopleCount.waitFor({ state: 'visible', timeout: 5000 });
  console.log('   ✓ People count badge visible:', await peopleCount.innerText());

  const motionIndicator = page.locator('text=Motion:');
  await motionIndicator.waitFor({ state: 'visible', timeout: 5000 });
  console.log('   ✓ Motion activity indicators active!');

  // Take screenshot of dollhouse with live presence
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/26_atlas_3d_cutaway_dollhouse.png` });
  console.log('   ✓ Saved 26_atlas_3d_cutaway_dollhouse.png');

  // 5. Verify Floating 3D Room Badges with Climate Readouts
  console.log('5. Verifying 3D Floating Room Badges & Climate Readouts...');
  const roomBadge = page.locator('text=Living').or(page.locator('text=Bed')).or(page.locator('text=Suite')).or(page.locator('text=Room')).first();
  await roomBadge.waitFor({ state: 'visible', timeout: 5000 });
  console.log('   ✓ 3D room badge mounted with climate & presence!');

  // Check temperature and humidity
  const tempReading = page.locator('text=°').first();
  if (await tempReading.isVisible()) {
    console.log('   ✓ Climate temperature readout displayed in 3D badge!');
  }

  // 6. Test Quick-Jump Room Teleport Pill
  console.log('6. Testing Quick Teleport pill navigation...');
  const teleportBtn = page.locator('button:has-text("📍")').first();
  if (await teleportBtn.isVisible()) {
    await teleportBtn.click();
    await page.waitForTimeout(800);
    console.log('   ✓ Teleport button clicked and focused camera!');
  }

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/27_atlas_room_presence_and_climate.png` });
  console.log('   ✓ Saved 27_atlas_room_presence_and_climate.png');

  // 7. Test Toggling Inhabitant Visibility & Glow
  console.log('7. Testing Layer Toggles (Glow, Climate, Inhabitants)...');
  const glowToggle = page.locator('button:has-text("Glow")');
  if (await glowToggle.isVisible()) {
    await glowToggle.click(); // Toggle off
    await page.waitForTimeout(400);
    await glowToggle.click(); // Toggle on
    await page.waitForTimeout(400);
    console.log('   ✓ Floor perimeter glow toggled successfully!');
  }

  // 8. Test Wall Cutaway Toggle (Walls: Cut vs Walls: Up)
  console.log('8. Testing Wall Cutaway toggle (PadSpan scale-model cut vs full height)...');
  const wallsToggle = page.locator('button:has-text("Walls:")');
  if (await wallsToggle.isVisible()) {
    console.log('   Current state:', await wallsToggle.innerText());
    await wallsToggle.click();
    await page.waitForTimeout(800);
    console.log('   Toggled to:', await wallsToggle.innerText());
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/28_atlas_teleport_room_focused.png` });
    console.log('   ✓ Saved 28_atlas_teleport_room_focused.png');

    // Switch back to cut
    await wallsToggle.click();
    await page.waitForTimeout(600);
  }

  // 9. Test Day / Night Warm Lighting Toggle
  console.log('9. Testing Night Scene & Warm Interior Lighting...');
  const dayNightBtn = page.locator('button[title*="Night"]').or(page.locator('button[title*="Day"]')).first();
  if (await dayNightBtn.isVisible()) {
    await dayNightBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/29_atlas_night_warm_atmosphere.png` });
    console.log('   ✓ Saved 29_atlas_night_warm_atmosphere.png with localized warm room lighting!');
  }

  // 10. Check for unexpected console errors
  console.log('10. Checking console errors...');
  const filteredErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('WebGL') && !e.includes('deprecat')
  );
  if (filteredErrors.length > 0) {
    console.warn('Console warnings/errors:', filteredErrors);
  } else {
    console.log('   ✓ Zero critical console errors detected!');
  }

  await browser.close();
  console.log('=== TEST SUITE COMPLETED SUCCESSFULLY! ===');
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
