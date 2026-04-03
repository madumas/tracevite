/**
 * Visual conformity audit — generates screenshots for manual review.
 *
 * Run:   npx playwright test e2e/visual-conformity.spec.ts
 * Then:  ask Claude Code to read e2e/screenshots/ and compare against spec.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { clickCanvas, moveOnCanvas, interactCanvas } from './helpers/canvas';
import { waitForStatus, clickAction, selectTool } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_BASE = path.join(__dirname, 'screenshots');

function projectDir(projectName: string): string {
  return projectName.toLowerCase().replace(/\s+/g, '-');
}

test('visual conformity audit', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const dir = path.join(SCREENSHOT_BASE, projectDir(testInfo.project.name));
  await fs.mkdir(dir, { recursive: true });
  const shot = (name: string) => path.join(dir, name);

  const isDesktop = testInfo.project.name === 'Desktop Chrome';
  const interact = (xMm: number, yMm: number) => interactCanvas(page, testInfo, xMm, yMm);

  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');

  // --- 01: Initial state ---
  await page.screenshot({ path: shot('01-initial-state.png'), fullPage: true });

  // --- 02: Toolbar in Simplifié mode ---
  await page.locator('[data-testid="toolbar"]').screenshot({ path: shot('02-toolbar-simplifie.png') });

  // --- 03: Mode selector dropdown open ---
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-dropdown"]').waitFor();
  await page.screenshot({ path: shot('03-mode-dropdown-open.png'), fullPage: true });

  // --- 04: Toolbar in Complet mode ---
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.locator('[data-testid="tool-circle"]').waitFor();
  await page.locator('[data-testid="toolbar"]').screenshot({ path: shot('04-toolbar-complet.png') });

  // Switch back to Simplifié for the rest of the flow
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-simplifie"]').click();
  await page.waitForTimeout(300);

  // --- 05: Status bar — segment start ---
  await page.locator('[data-testid="status-bar"]').screenshot({ path: shot('05-status-segment-start.png') });

  // --- 06: First point placed ---
  await interact(60, 60);
  await waitForStatus(page, /deuxième/);
  await page.screenshot({ path: shot('06-first-point-placed.png'), fullPage: true });

  // --- 07: Ghost segment preview (desktop only — no hover on touch) ---
  if (isDesktop) {
    await moveOnCanvas(page, 110, 60);
    await page.waitForTimeout(100);
    await page.screenshot({ path: shot('07-ghost-segment.png'), fullPage: true });
  }

  // --- 08: Segment complete ---
  await interact(110, 60);
  await expectSegmentCount(page, 1);
  await page.screenshot({ path: shot('08-segment-complete.png'), fullPage: true });

  // --- 09: Triangle closed (3 segments) ---
  await interact(85, 100);
  await expectSegmentCount(page, 2);
  await interact(60, 60); // close back to point A
  await expectSegmentCount(page, 3);
  await page.keyboard.press('Escape'); // exit chaining
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('09-triangle-closed.png'), fullPage: true });

  // --- 10: Properties panel open ---
  const panel = page.locator('[data-testid="properties-panel"]');
  const panelAlreadyOpen = await panel.isVisible();
  if (!panelAlreadyOpen) {
    // Panel collapsed — click the toggle to open it
    const panelToggle = page.locator('[data-testid="panel-toggle"], [data-testid="panel-toggle-mobile"]');
    await panelToggle.click();
    await panel.waitFor();
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('10-properties-panel.png'), fullPage: true });

  // --- 11: Properties panel detail ---
  await panel.screenshot({ path: shot('11-properties-panel-detail.png') });

  // Close the panel if we opened it
  if (!panelAlreadyOpen) {
    await page.locator('[aria-label="Fermer le panneau"]').click({ force: true });
    await page.waitForTimeout(200);
  }

  // --- 12: Context action bar (click on a segment) ---
  // Click on the midpoint of segment AB (60,60)→(110,60) = midpoint at (85,60)
  await interact(85, 60);
  await page.waitForTimeout(300);
  const contextBar = page.locator('[data-testid="context-action-bar"]');
  if (await contextBar.isVisible()) {
    await page.screenshot({ path: shot('12-context-action-bar.png'), fullPage: true });
  }
  // Deselect
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 13: Print dialog ---
  await clickAction(page, 'print');
  await page.locator('[data-testid="print-dialog"]').waitFor();
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('13-print-dialog.png'), fullPage: true });

  // --- 14: Print dialog detail ---
  await page.locator('[data-testid="print-dialog"]').screenshot({ path: shot('14-print-dialog-detail.png') });

  // Close print dialog
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 15: Action bar ---
  await page.locator('[data-testid="action-bar"]').screenshot({ path: shot('15-action-bar.png') });

  // --- 17: Color palette overview ---
  await page.screenshot({ path: shot('17-color-palette.png'), fullPage: true });

  // =====================================================================
  // Additional screenshots for TDC clinical audit
  // =====================================================================

  // --- 18: Delete micro-confirmation ---
  // Ensure no overlay is blocking, then enter delete mode
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.locator('[data-testid="action-delete"]').click({ force: true });
  await page.waitForTimeout(200);
  await interact(85, 60); // click midpoint of segment AB
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('18-delete-micro-confirm.png'), fullPage: true });
  // Cancel delete mode
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 19: Slot manager ("Mes travaux") — new construction is inside ---
  await page.locator('[data-testid="slot-manager-btn"]').click();
  const slotDialog = page.locator('[data-testid="slot-manager"]');
  if (await slotDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('19-slot-manager-dialog.png'), fullPage: true });
    await slotDialog.screenshot({ path: shot('19b-slot-manager-detail.png') });
    // Close — don't create a new construction
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // --- 20: Chaining state (pulsing anchor + ghost) ---
  // Create a new segment to enter chaining mode
  await interact(150, 60);
  await waitForStatus(page, /deuxième/);
  await interact(200, 60);
  await page.waitForTimeout(200);
  // Now in chaining state — anchor at (200,60), status says "Continue depuis..."
  if (isDesktop) {
    await moveOnCanvas(page, 200, 100); // move cursor to show ghost
    await page.waitForTimeout(100);
  }
  await page.screenshot({ path: shot('20-chaining-state.png'), fullPage: true });
  await page.keyboard.press('Escape'); // exit chaining
  await page.waitForTimeout(200);

  // --- 21: Circle tool two-click ---
  // Switch to complet mode for circle tool
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
  await selectTool(page, 'circle');
  await waitForStatus(page, /centre/);
  await interact(160, 130);
  await page.waitForTimeout(200);
  // Center placed, now showing radius preview
  if (isDesktop) {
    await moveOnCanvas(page, 190, 130);
    await page.waitForTimeout(100);
  }
  await page.screenshot({ path: shot('21-circle-center-placed.png'), fullPage: true });
  // Complete the circle
  await interact(190, 130);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 22: Move tool pick-up/put-down ---
  await selectTool(page, 'move');
  await waitForStatus(page, /ramasser/);
  // Pick up a point (point A at 60,60)
  await interact(60, 60);
  await page.waitForTimeout(300);
  // Point is now "in flight"
  if (isDesktop) {
    await moveOnCanvas(page, 70, 80); // show ghost at new position
    await page.waitForTimeout(100);
  }
  await page.screenshot({ path: shot('22-move-pickup.png'), fullPage: true });
  // Put down
  await interact(65, 75);
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 23: "Plus d'outils" expanded ---
  // Switch back to simplifié
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-simplifie"]').click();
  await page.waitForTimeout(300);
  // Click more tools button
  const moreTools = page.locator('[data-testid="more-tools"]');
  if (await moreTools.isVisible()) {
    await moreTools.click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid="toolbar"]').screenshot({ path: shot('23-more-tools-open.png') });
    // Close it
    await moreTools.click();
    await page.waitForTimeout(200);
  }

  // --- 24: Visual clutter (6+ segments, angle labels hidden) ---
  // We already have triangle (3 segments) + 1 extra segment + 1 circle
  // Add more segments to exceed clutter threshold (5 in simplifié)
  await page.locator('[data-testid="tool-segment"]').click();
  await page.waitForTimeout(300);
  for (const yMm of [140, 160, 180]) {
    await interact(30, yMm);
    await page.waitForTimeout(300);
    await interact(80, yMm);
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: shot('24-visual-clutter.png'), fullPage: true });

  // --- 25: Settings dialog ---
  const settingsBtn = page.locator('[data-testid="settings-button"]');
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    const settingsDialog = page.locator('[data-testid="settings-dialog"]');
    if (await settingsDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.screenshot({ path: shot('25-settings-dialog.png'), fullPage: true });
      await settingsDialog.screenshot({ path: shot('25b-settings-detail.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  }

  // =====================================================================
  // Pedagogical & workflow screenshots
  // =====================================================================

  // --- 26: Consigne banner (teacher exercise instruction) ---
  // Navigate with consigne URL param
  await page.goto('/?consigne=Construis%20un%20triangle%20rectangle%20dont%20le%20plus%20long%20c%C3%B4t%C3%A9%20mesure%207%20cm.');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('26-consigne-banner.png'), fullPage: true });

  // --- 27: Slot manager (Mes constructions) ---
  const slotBtn = page.locator('[data-testid="slot-manager-btn"]');
  if (await slotBtn.isVisible()) {
    await slotBtn.click();
    const slotManager = page.locator('[data-testid="slot-manager"]');
    if (await slotManager.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.screenshot({ path: shot('27-slot-manager.png'), fullPage: true });
      await slotManager.screenshot({ path: shot('27b-slot-manager-detail.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  }

  // --- 28: "Terminer" button during chaining (status bar detail) ---
  // Dismiss any overlay (consigne popover, etc.)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.locator('[data-testid="tool-segment"]').click({ force: true });
  await page.waitForTimeout(200);
  await interact(40, 50);
  await page.waitForTimeout(300);
  await interact(90, 50);
  await page.waitForTimeout(300);
  // Now in chaining state — "Terminer" button should be visible
  await page.locator('[data-testid="status-bar"]').screenshot({ path: shot('28-terminer-button.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 29: "Annuler" button during move (status bar detail) ---
  await selectTool(page, 'move');
  await page.waitForTimeout(200);
  await interact(40, 50); // pick up a point
  await page.waitForTimeout(300);
  const escapeBtn = page.locator('[data-testid="status-escape-btn"]');
  if (await escapeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('[data-testid="status-bar"]').screenshot({ path: shot('29-annuler-button.png') });
    await escapeBtn.click(); // cancel the move
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(200);

  // --- 30: Angles accordion expanded in properties panel ---
  const panelForAngles = page.locator('[data-testid="properties-panel"]');
  const panelOpenForAngles = await panelForAngles.isVisible();
  if (!panelOpenForAngles) {
    const toggle = page.locator('[data-testid="panel-toggle"], [data-testid="panel-toggle-mobile"]');
    await toggle.click();
    await panelForAngles.waitFor();
  }
  await page.waitForTimeout(200);
  const anglesAccordion = page.locator('[data-testid="accordion-Angles"]');
  if (await anglesAccordion.isVisible()) {
    await anglesAccordion.click();
    await page.waitForTimeout(300);
    await panelForAngles.screenshot({ path: shot('30-angles-accordion.png') });
  }

  // --- 31: Figure classification (Propriétés accordion) ---
  const propsAccordion = page.locator('[data-testid="accordion-Propriétés"]');
  if (await propsAccordion.isVisible()) {
    await propsAccordion.click();
    await page.waitForTimeout(300);
    await panelForAngles.screenshot({ path: shot('31-figure-classification.png') });
  }

  // Close panel if we opened it
  if (!panelOpenForAngles) {
    await page.locator('[aria-label="Fermer le panneau"]').click({ force: true });
    await page.waitForTimeout(200);
  }

  // --- 32: Measure/Fix length (context action bar on segment) ---
  await page.locator('[data-testid="tool-segment"]').click();
  await page.waitForTimeout(200);
  await interact(40, 50); // click near existing point to select segment
  await page.waitForTimeout(300);
  const fixBtn = page.locator('[data-testid="context-fix-length"]');
  if (await fixBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('32-fix-length-context.png'), fullPage: true });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // =====================================================================
  // Extended visual coverage — tools, modes, accessibility
  // =====================================================================

  // --- 34: Length input field (inline on segment) ---
  await page.locator('[data-testid="tool-segment"]').click({ force: true });
  await page.waitForTimeout(200);
  await interact(120, 50);
  await page.waitForTimeout(300);
  await interact(170, 50);
  await page.waitForTimeout(500);
  const lengthInput = page.locator('[data-testid="length-input"]');
  if (await lengthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('34-length-input.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 35: Right angle marker (create perpendicular segments) ---
  await page.locator('[data-testid="tool-segment"]').click({ force: true });
  await page.waitForTimeout(200);
  await interact(140, 80);
  await page.waitForTimeout(300);
  await interact(140, 120);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Right angle at (140,80) between horizontal and vertical segments
  await page.screenshot({ path: shot('35-right-angle-marker.png'), fullPage: true });

  // --- 36: Reflection tool (axis + reflected figure) ---
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
  await selectTool(page, 'reflection');
  await page.waitForTimeout(300);
  // Define axis: vertical line at x=100
  await interact(100, 40);
  await page.waitForTimeout(300);
  await interact(100, 140);
  await page.waitForTimeout(300);
  // Click on a segment to reflect
  await interact(85, 60);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('36-reflection-result.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 37: Estimation mode (measurements hidden) ---
  const settingsBtnEst = page.locator('[data-testid="settings-button"]');
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  // Enable estimation mode
  const estCheckbox = page.locator('text=Mode estimation').locator('..').locator('input[type="checkbox"]');
  if (await estCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
    await estCheckbox.click({ force: true });
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape'); // close settings
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('37-estimation-hidden.png'), fullPage: true });
  // Disable estimation mode
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  if (await estCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
    await estCheckbox.click({ force: true });
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 38: Zoomed state ---
  const zoomIn = page.locator('[data-testid="zoom-in"]');
  if (await zoomIn.isVisible({ timeout: 1000 }).catch(() => false)) {
    for (let i = 0; i < 3; i++) {
      await zoomIn.click();
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('38-zoomed-state.png'), fullPage: true });
    // Zoom back out
    const zoomOut = page.locator('[data-testid="zoom-out"]');
    for (let i = 0; i < 3; i++) {
      await zoomOut.click();
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(200);
  }

  // --- 39: High contrast mode ---
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  const hcCheckbox = page.locator('text=Contraste élevé').locator('..').locator('input[type="checkbox"]');
  if (await hcCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
    await hcCheckbox.click({ force: true });
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('39-high-contrast.png'), fullPage: true });
  // Disable high contrast
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  if (await hcCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
    await hcCheckbox.click({ force: true });
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 40: Segment color (change to green) ---
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  const greenColor = page.locator('[aria-label="Vert"]');
  if (await greenColor.isVisible({ timeout: 1000 }).catch(() => false)) {
    await greenColor.click();
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('40-segment-color-green.png'), fullPage: true });
  // Restore blue
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  const blueColor = page.locator('[aria-label="Bleu"]');
  if (await blueColor.isVisible({ timeout: 1000 }).catch(() => false)) {
    await blueColor.click();
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 41: Panel on left side ---
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  const panelSelect = page.locator('text=Panneau latéral').locator('..').locator('select');
  if (await panelSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
    await panelSelect.selectOption('left');
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('41-panel-left.png'), fullPage: true });
  // Restore right
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  if (await panelSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
    await panelSelect.selectOption('right');
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 42: Font scale 1.5x ---
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  const fontSelect = page.locator('text=Taille du texte').locator('..').locator('select');
  if (await fontSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
    await fontSelect.selectOption('1.5');
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('42-font-scale-1.5x.png'), fullPage: true });
  // Restore normal
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  if (await fontSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
    await fontSelect.selectOption('1');
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 43: Unit mm ---
  await page.locator('[data-testid="unit-toggle"]').click({ force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('43-unit-mm.png'), fullPage: true });
  // Restore cm
  await page.locator('[data-testid="unit-toggle"]').click({ force: true });
  await page.waitForTimeout(200);

  // --- 44: Perpendicular tool result ---
  await selectTool(page, 'perpendicular');
  await page.waitForTimeout(300);
  // Click reference segment (horizontal at y=50)
  await interact(145, 50);
  await page.waitForTimeout(300);
  // Start point
  await interact(155, 50);
  await page.waitForTimeout(300);
  // End point (perpendicular direction)
  await interact(155, 90);
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('44-perpendicular-tool.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 45: Parallel tool result ---
  await selectTool(page, 'parallel');
  await page.waitForTimeout(300);
  // Click reference segment
  await interact(145, 50);
  await page.waitForTimeout(300);
  // Start point above
  await interact(130, 30);
  await page.waitForTimeout(300);
  // End point (parallel)
  await interact(180, 30);
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('45-parallel-tool.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 46: Cartesian plane (1 quadrant) ---
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  const cartSelect = page.locator('text=Plan cartésien').locator('..').locator('select');
  if (await cartSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cartSelect.selectOption('1quadrant');
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('46-cartesian-plane.png'), fullPage: true });
  // Disable cartesian
  await settingsBtnEst.click();
  await page.waitForTimeout(300);
  if (await cartSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cartSelect.selectOption('off');
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 47: Snap feedback — point snap halo (desktop only) ---
  if (isDesktop) {
    // Switch to segment tool and move cursor near an existing point to trigger snap halo
    await page.locator('[data-testid="tool-segment"]').click({ force: true });
    await page.waitForTimeout(200);
    // Move near point A (60,60) to trigger snap-to-point feedback (r=12px halo)
    await moveOnCanvas(page, 61, 61);
    await page.waitForTimeout(150);
    await page.screenshot({ path: shot('47-snap-feedback-point.png'), fullPage: true });

    // --- 48: Snap feedback — midpoint snap diamond ---
    // Move near midpoint of segment AB (85,60) to trigger midpoint snap
    await moveOnCanvas(page, 85, 60);
    await page.waitForTimeout(150);
    await page.screenshot({ path: shot('48-snap-feedback-midpoint.png'), fullPage: true });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // =====================================================================
  // Pedagogical details + visual clutter stress tests
  // =====================================================================

  // --- 49: Fixed segment length (context action + visual state) ---
  // Navigate fresh to avoid state from previous screenshots
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(300);
  // Create a segment
  await interact(50, 60);
  await page.waitForTimeout(300);
  await interact(100, 60);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Click on segment to select it and show context action bar
  await interact(75, 60);
  await page.waitForTimeout(300);
  const fixLenBtn = page.locator('[data-testid="context-fix-length"]');
  if (await fixLenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('49-fix-length-context.png'), fullPage: true });
    // Click to fix the length
    await fixLenBtn.click();
    await page.waitForTimeout(300);
    const lenInput = page.locator('[data-testid="length-input"]');
    if (await lenInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.screenshot({ path: shot('49b-length-input-dialog.png'), fullPage: true });
      await page.keyboard.press('Enter'); // confirm current length
      await page.waitForTimeout(300);
    }
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 50: Triangle rectangle isocèle (classification in Complet) ---
  // Switch to complet mode
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="tool-segment"]').click({ force: true });
  await page.waitForTimeout(200);
  // Create right isosceles triangle: A(50,40), B(100,40), C(100,90) — right angle at B
  await interact(50, 40);
  await page.waitForTimeout(300);
  await interact(100, 40);
  await page.waitForTimeout(300);
  await interact(100, 90);
  await page.waitForTimeout(300);
  await interact(50, 40); // close the triangle
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Open properties panel to show classification
  const panelToggle50 = page.locator('[data-testid="panel-toggle"], [data-testid="panel-toggle-mobile"]');
  const panel50 = page.locator('[data-testid="properties-panel"]');
  if (!(await panel50.isVisible())) {
    await panelToggle50.click();
    await panel50.waitFor();
    await page.waitForTimeout(300);
  }
  // Expand Propriétés accordion
  const propsAcc50 = page.locator('[data-testid="accordion-Propriétés"]');
  if (await propsAcc50.isVisible()) {
    await propsAcc50.click();
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: shot('50-triangle-classification.png'), fullPage: true });
  await panel50.screenshot({ path: shot('50b-classification-detail.png') });

  // --- 51: Snap guide (parallel/perpendicular during segment creation) ---
  if (isDesktop) {
    await page.locator('[data-testid="tool-segment"]').click({ force: true });
    await page.waitForTimeout(200);
    // Start a new segment from a point not on the triangle
    await interact(50, 120);
    await page.waitForTimeout(300);
    // Move cursor to align parallel with segment AB (horizontal at y=40)
    // Moving to (100, 120) would be parallel to AB
    await moveOnCanvas(page, 100, 120);
    await page.waitForTimeout(200);
    await page.screenshot({ path: shot('51-snap-guide-parallel.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // --- 52-55: Visual clutter stress tests (progressive density) ---
  // Navigate fresh for clean canvas
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(300);

  // Create segments progressively and screenshot at key thresholds
  const segCoords: Array<[number, number, number, number]> = [
    [30, 50, 80, 50],   // 1: horizontal
    [30, 70, 80, 70],   // 2: horizontal
    [30, 90, 80, 90],   // 3: horizontal
    [30, 50, 30, 90],   // 4: connects left side (creates angles)
    [80, 50, 80, 90],   // 5: connects right side (5th = threshold simplifié)
  ];

  for (const [x1, y1, x2, y2] of segCoords) {
    await interact(x1, y1);
    await page.waitForTimeout(300);
    await interact(x2, y2);
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  // --- 52: At threshold (5 segments in simplifié) — labels should still be visible
  await page.screenshot({ path: shot('52-clutter-at-threshold.png'), fullPage: true });

  // Add 3 more segments to exceed threshold
  const moreSegs: Array<[number, number, number, number]> = [
    [30, 110, 80, 110], // 6: exceeds threshold
    [50, 50, 50, 110],  // 7: vertical center
    [30, 130, 80, 130], // 8: another horizontal
  ];
  for (const [x1, y1, x2, y2] of moreSegs) {
    await interact(x1, y1);
    await page.waitForTimeout(300);
    await interact(x2, y2);
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  // --- 53: Over threshold (8 segments) — labels should be hidden on canvas
  await page.screenshot({ path: shot('53-clutter-over-threshold.png'), fullPage: true });

  // Add more for dense construction (12+ segments)
  const denseSegs: Array<[number, number, number, number]> = [
    [30, 150, 80, 150], // 9
    [30, 170, 80, 170], // 10
    [60, 50, 60, 170],  // 11
    [40, 50, 40, 170],  // 12
  ];
  for (const [x1, y1, x2, y2] of denseSegs) {
    await interact(x1, y1);
    await page.waitForTimeout(300);
    await interact(x2, y2);
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  // --- 54: Dense construction (12 segments) — stress test canvas readability
  await page.screenshot({ path: shot('54-clutter-dense-12seg.png'), fullPage: true });

  // --- 55: Dense construction with panel showing all data
  const panelDense = page.locator('[data-testid="properties-panel"]');
  if (!(await panelDense.isVisible())) {
    const toggle = page.locator('[data-testid="panel-toggle"], [data-testid="panel-toggle-mobile"]');
    await toggle.click();
    await panelDense.waitFor();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: shot('55-clutter-dense-with-panel.png'), fullPage: true });

  // --- 56-57: Hover reveals hidden labels in clutter mode (desktop only) ---
  if (isDesktop) {
    // Hover over a segment to reveal its hidden length label + congruence marks
    await moveOnCanvas(page, 55, 50);
    await page.waitForTimeout(200);
    await page.screenshot({ path: shot('56-clutter-hover-segment.png'), fullPage: true });

    // Hover over an intersection point to reveal angle labels
    await moveOnCanvas(page, 30, 50);
    await page.waitForTimeout(200);
    await page.screenshot({ path: shot('57-clutter-hover-angles.png'), fullPage: true });
  }
});

// --- Separate test: PFEQ pedagogical conformity scenarios ---
test('visual conformity — PFEQ pedagogical', async ({ page }, testInfo) => {
  const dir = path.join(SCREENSHOT_BASE, projectDir(testInfo.project.name));
  await fs.mkdir(dir, { recursive: true });
  const shot = (name: string) => path.join(dir, name);
  const interact = (xMm: number, yMm: number) => interactCanvas(page, testInfo, xMm, yMm);

  // ── 60: Simple triangle with classification (Simplifié) ──
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(300);
  // Create a clean right triangle: A(50,50), B(100,50), C(100,90)
  await interact(50, 50);
  await page.waitForTimeout(300);
  await interact(100, 50);
  await page.waitForTimeout(300);
  await interact(100, 90);
  await page.waitForTimeout(300);
  await interact(50, 50); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Open panel and expand all sections
  const panel = page.locator('[data-testid="properties-panel"]');
  if (!(await panel.isVisible())) {
    const toggle = page.locator('[data-testid="panel-toggle"], [data-testid="panel-toggle-mobile"]');
    await toggle.click();
    await panel.waitFor();
    await page.waitForTimeout(300);
  }
  // Expand Angles
  const anglesAcc = page.locator('[data-testid="accordion-Angles"]');
  if (await anglesAcc.isVisible()) await anglesAcc.click();
  await page.waitForTimeout(200);
  // Expand Propriétés
  const propsAcc = page.locator('[data-testid="accordion-Propriétés"]');
  if (await propsAcc.isVisible()) await propsAcc.click();
  await page.waitForTimeout(200);
  // Expand Sommets
  const sommetsAcc = page.locator('[data-testid="accordion-Sommets"]');
  if (await sommetsAcc.isVisible()) await sommetsAcc.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('60-pfeq-triangle-simplifie.png'), fullPage: true });
  await panel.screenshot({ path: shot('60b-pfeq-triangle-panel.png') });

  // ── 61: Same triangle in Complet mode (angles with degrees) ──
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('61-pfeq-triangle-complet.png'), fullPage: true });
  await panel.screenshot({ path: shot('61b-pfeq-angles-degrees.png') });

  // ── 62: Rectangle with properties (parallelism, perpendicularity) ──
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(300);
  // Switch to complet
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
  await page.waitForTimeout(300);
  // Create rectangle: A(40,40), B(120,40), C(120,80), D(40,80)
  await interact(40, 40);
  await page.waitForTimeout(300);
  await interact(120, 40);
  await page.waitForTimeout(300);
  await interact(120, 80);
  await page.waitForTimeout(300);
  await interact(40, 80);
  await page.waitForTimeout(300);
  await interact(40, 40); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Open panel
  const panel62 = page.locator('[data-testid="properties-panel"]');
  if (!(await panel62.isVisible())) {
    const toggle = page.locator('[data-testid="panel-toggle"], [data-testid="panel-toggle-mobile"]');
    await toggle.click();
    await panel62.waitFor();
    await page.waitForTimeout(300);
  }
  // Expand all
  for (const name of ['Angles', 'Propriétés', 'Sommets']) {
    const acc = page.locator(`[data-testid="accordion-${name}"]`);
    if (await acc.isVisible()) { await acc.click(); await page.waitForTimeout(150); }
  }
  await page.screenshot({ path: shot('62-pfeq-rectangle.png'), fullPage: true });
  await panel62.screenshot({ path: shot('62b-pfeq-rectangle-panel.png') });

  // ── 63: Properties hidden (evaluation mode toggle) ──
  const hideCheck = page.locator('text=Masquer les propriétés').locator('..').locator('input[type="checkbox"]');
  if (await hideCheck.isVisible({ timeout: 1000 }).catch(() => false)) {
    await hideCheck.click({ force: true });
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('63-pfeq-properties-hidden.png'), fullPage: true });
    await panel62.screenshot({ path: shot('63b-pfeq-properties-hidden-panel.png') });
    // Restore
    await hideCheck.click({ force: true });
    await page.waitForTimeout(200);
  }

  // ── 64: Consigne with mode parameter ──
  await page.goto('/?consigne=Trace%20un%20rectangle%20ABCD%20tel%20que%20AB%20%3D%206%20cm%20et%20BC%20%3D%204%20cm.&mode=simplifie');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('64-pfeq-consigne-mode.png'), fullPage: true });

  // ── 65: Print dialog — "Avec mesures" checked ──
  // Create a quick segment for print context
  await interact(60, 60);
  await page.waitForTimeout(300);
  await interact(120, 60);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.locator('[data-testid="action-print"]').click({ force: true });
  await page.locator('[data-testid="print-dialog"]').waitFor();
  await page.waitForTimeout(200);
  await page.locator('[data-testid="print-dialog"]').screenshot({ path: shot('65-pfeq-print-with-measures.png') });

  // ── 66: Print dialog — "Figure seule" (sans mesures) ──
  const measuresCheck = page.locator('text=Avec mesures').locator('..').locator('input[type="checkbox"]');
  if (await measuresCheck.isVisible({ timeout: 1000 }).catch(() => false)) {
    await measuresCheck.click({ force: true });
    await page.waitForTimeout(200);
    await page.locator('[data-testid="print-dialog"]').screenshot({ path: shot('66-pfeq-print-figure-only.png') });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
});

// --- Separate test: PFEQ figures and tools ---
test('visual conformity — PFEQ figures & tools', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const dir = path.join(SCREENSHOT_BASE, projectDir(testInfo.project.name));
  await fs.mkdir(dir, { recursive: true });
  const shot = (name: string) => path.join(dir, name);
  const interact = (xMm: number, yMm: number) => interactCanvas(page, testInfo, xMm, yMm);
  const isDesktop = testInfo.project.name === 'Desktop Chrome';

  // ── Helper: fresh page in complet mode, no auto-intersection ──
  async function freshComplet() {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');
    await page.waitForTimeout(300);
    // Clear canvas if it has elements from previous test
    const newBtn = page.locator('[data-testid="action-new"]');
    if (await newBtn.isVisible()) {
      await newBtn.click();
      const confirmBtn = page.locator('[data-testid="confirm-dialog-confirm"]');
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(300);
      }
    }
    await page.locator('[data-testid="mode-selector"]').click();
    await page.locator('[data-testid="mode-option-complet"]').click();
    await page.waitForTimeout(300);
    // Disable auto-intersection for clean figure tests
    const settingsBtn = page.locator('[data-testid="settings-button"]');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(200);
      const aiCheckbox = page.locator('text=Intersections automatiques').locator('..').locator('input[type="checkbox"]');
      if (await aiCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        const checked = await aiCheckbox.isChecked();
        if (checked) await aiCheckbox.click({ force: true });
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  }
  async function openPanel() {
    const p = page.locator('[data-testid="properties-panel"]');
    if (!(await p.isVisible())) {
      const t = page.locator('[data-testid="panel-toggle"], [data-testid="panel-toggle-mobile"]');
      await t.click();
      await p.waitFor();
      await page.waitForTimeout(200);
    }
    // Expand all accordion sections
    for (const name of ['Angles', 'Propriétés', 'Sommets']) {
      const acc = page.locator(`[data-testid="accordion-${name}"]`);
      if (await acc.isVisible()) { await acc.click(); await page.waitForTimeout(100); }
    }
    return p;
  }

  // ── 70: Square (Carré) ──
  await freshComplet();
  await interact(50, 50);
  await page.waitForTimeout(250);
  await interact(90, 50);
  await page.waitForTimeout(250);
  await interact(90, 90);
  await page.waitForTimeout(250);
  await interact(50, 90);
  await page.waitForTimeout(250);
  await interact(50, 50); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel70 = await openPanel();
  await page.screenshot({ path: shot('70-pfeq-carre.png'), fullPage: true });
  await panel70.screenshot({ path: shot('70b-pfeq-carre-panel.png') });

  // ── 71: Parallelogram (Parallélogramme) ──
  await freshComplet();
  await interact(40, 60);
  await page.waitForTimeout(250);
  await interact(100, 60);
  await page.waitForTimeout(250);
  await interact(120, 90);
  await page.waitForTimeout(250);
  await interact(60, 90);
  await page.waitForTimeout(250);
  await interact(40, 60); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel71 = await openPanel();
  await page.screenshot({ path: shot('71-pfeq-parallelogramme.png'), fullPage: true });
  await panel71.screenshot({ path: shot('71b-pfeq-parallelogramme-panel.png') });

  // ── 72: Isosceles triangle (Triangle isocèle) ──
  await freshComplet();
  await interact(50, 90);
  await page.waitForTimeout(250);
  await interact(100, 90);
  await page.waitForTimeout(250);
  await interact(75, 50);
  await page.waitForTimeout(250);
  await interact(50, 90); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel72 = await openPanel();
  await page.screenshot({ path: shot('72-pfeq-triangle-isocele.png'), fullPage: true });
  await panel72.screenshot({ path: shot('72b-pfeq-triangle-isocele-panel.png') });

  // ── 73: Circle with radius/diameter ──
  await freshComplet();
  await selectTool(page, 'circle');
  await page.waitForTimeout(200);
  await interact(80, 70);
  await page.waitForTimeout(300);
  await interact(110, 70); // radius 30mm
  await page.waitForTimeout(500);
  // RadiusInput may appear
  const radiusInput = page.locator('[data-testid="radius-input"]');
  if (await radiusInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('73-pfeq-cercle-rayon.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } else {
    await page.screenshot({ path: shot('73-pfeq-cercle-rayon.png'), fullPage: true });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel73 = await openPanel();
  await panel73.screenshot({ path: shot('73b-pfeq-cercle-panel.png') });

  // ── 74: Flat angle (Angle plat — 3 points colinéaires) ──
  await freshComplet();
  await interact(40, 80);
  await page.waitForTimeout(250);
  await interact(80, 80);
  await page.waitForTimeout(250);
  await interact(120, 80);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel74 = await openPanel();
  await page.screenshot({ path: shot('74-pfeq-angle-plat.png'), fullPage: true });
  await panel74.screenshot({ path: shot('74b-pfeq-angle-plat-panel.png') });

  // ── 80: Rectangle propre (clean, isolated) ──
  await freshComplet();
  await interact(40, 50);
  await page.waitForTimeout(250);
  await interact(110, 50);
  await page.waitForTimeout(250);
  await interact(110, 85);
  await page.waitForTimeout(250);
  await interact(40, 85);
  await page.waitForTimeout(250);
  await interact(40, 50); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel80 = await openPanel();
  await page.screenshot({ path: shot('80-pfeq-rectangle.png'), fullPage: true });
  await panel80.screenshot({ path: shot('80b-pfeq-rectangle-panel.png') });

  // ── 81: Losange (4 equal sides, non-right angles) ──
  await freshComplet();
  await interact(80, 40);
  await page.waitForTimeout(250);
  await interact(115, 70);
  await page.waitForTimeout(250);
  await interact(80, 100);
  await page.waitForTimeout(250);
  await interact(45, 70);
  await page.waitForTimeout(250);
  await interact(80, 40); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel81 = await openPanel();
  await page.screenshot({ path: shot('81-pfeq-losange.png'), fullPage: true });
  await panel81.screenshot({ path: shot('81b-pfeq-losange-panel.png') });

  // ── 82: Triangle équilatéral (3 equal sides) ──
  await freshComplet();
  // 50mm sides: A(50,87), B(100,87), C(75,44) — height = 50*sin(60°) ≈ 43
  await interact(50, 87);
  await page.waitForTimeout(250);
  await interact(100, 87);
  await page.waitForTimeout(250);
  await interact(75, 44);
  await page.waitForTimeout(250);
  await interact(50, 87); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel82 = await openPanel();
  await page.screenshot({ path: shot('82-pfeq-triangle-equilateral.png'), fullPage: true });
  await panel82.screenshot({ path: shot('82b-pfeq-triangle-equilateral-panel.png') });

  // ── 83: Trapèze (1 pair of parallel sides) ──
  await freshComplet();
  // A(50,50), B(110,50) top side, C(120,90), D(40,90) bottom side — AB//DC but different lengths
  await interact(50, 50);
  await page.waitForTimeout(250);
  await interact(110, 50);
  await page.waitForTimeout(250);
  await interact(130, 90);
  await page.waitForTimeout(250);
  await interact(30, 90);
  await page.waitForTimeout(250);
  await interact(50, 50); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel83 = await openPanel();
  await page.screenshot({ path: shot('83-pfeq-trapeze.png'), fullPage: true });
  await panel83.screenshot({ path: shot('83b-pfeq-trapeze-panel.png') });

  // ── 75: Reflection tool (cleaner version) ──
  await freshComplet();
  // Create a triangle to reflect
  await interact(40, 50);
  await page.waitForTimeout(250);
  await interact(70, 50);
  await page.waitForTimeout(250);
  await interact(55, 80);
  await page.waitForTimeout(250);
  await interact(40, 50); // close
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Select reflection tool
  await selectTool(page, 'reflection');
  await page.waitForTimeout(300);
  // Define vertical axis at x=100
  await interact(100, 30);
  await page.waitForTimeout(300);
  await interact(100, 120);
  await page.waitForTimeout(300);
  // Reflect each segment of the triangle
  await interact(55, 50); // click segment AB
  await page.waitForTimeout(500);
  await interact(63, 65); // click segment BC
  await page.waitForTimeout(500);
  await interact(48, 65); // click segment CA
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('75-pfeq-reflexion.png'), fullPage: true });

  // ── 76: Reproduce tool ──
  await freshComplet();
  // Create a segment
  await interact(40, 60);
  await page.waitForTimeout(250);
  await interact(90, 60);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Select reproduce tool
  await selectTool(page, 'reproduce');
  await page.waitForTimeout(300);
  // Click on the segment to reproduce
  await interact(65, 60);
  await page.waitForTimeout(300);
  // Click to place the copy
  await interact(65, 100);
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('76-pfeq-reproduire.png'), fullPage: true });

  // ── 77: Compare tool ──
  await freshComplet();
  // Create 2 segments of same length
  await interact(40, 50);
  await page.waitForTimeout(250);
  await interact(90, 50);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await interact(40, 100);
  await page.waitForTimeout(250);
  await interact(90, 100);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Select compare tool
  await selectTool(page, 'compare');
  await page.waitForTimeout(300);
  // Click first segment
  await interact(65, 50);
  await page.waitForTimeout(300);
  // Click second segment
  await interact(65, 100);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('77-pfeq-comparer.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── 78: Frieze tool ──
  await freshComplet();
  // Create a segment to repeat
  await interact(40, 70);
  await page.waitForTimeout(250);
  await interact(70, 70);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Select frieze tool
  await selectTool(page, 'frieze');
  await page.waitForTimeout(300);
  // Click on segment
  await interact(55, 70);
  await page.waitForTimeout(300);
  // Define translation vector
  await interact(30, 50);
  await page.waitForTimeout(300);
  await interact(70, 50);
  await page.waitForTimeout(300);
  // Frieze panel should appear
  const friezePanel = page.locator('[data-testid="frieze-panel"]');
  if (await friezePanel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.screenshot({ path: shot('78-pfeq-frise.png'), fullPage: true });
    // Validate
    const validateBtn = page.locator('[data-testid="frieze-validate"]');
    if (await validateBtn.isVisible()) {
      await validateBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: shot('78b-pfeq-frise-result.png'), fullPage: true });
    }
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── 79: Symmetry tool ──
  await freshComplet();
  // Create a vertical axis
  await interact(80, 30);
  await page.waitForTimeout(250);
  await interact(80, 120);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Create a segment on the left
  await interact(40, 60);
  await page.waitForTimeout(250);
  await interact(60, 90);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Create its mirror on the right
  await interact(100, 60);
  await page.waitForTimeout(250);
  await interact(120, 90);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Select symmetry tool
  await selectTool(page, 'symmetry');
  await page.waitForTimeout(300);
  // Click the axis
  await interact(80, 75);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('79-pfeq-symetrie.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── 84: Rotation tool (center + angle panel + result) ──
  await freshComplet();
  // Create a triangle
  await interact(40, 50);
  await page.waitForTimeout(250);
  await interact(80, 50);
  await page.waitForTimeout(250);
  await interact(60, 80);
  await page.waitForTimeout(250);
  await interact(40, 50);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Activate rotation tool
  await page.locator('[data-testid="tool-rotation"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('84a-pfeq-rotation-idle.png'), fullPage: true });
  // Place center of rotation
  await interact(40, 50);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('84b-pfeq-rotation-angle-panel.png'), fullPage: true });
  // Click 90° preset button
  const btn90 = page.locator('button', { hasText: '90°' });
  if (await btn90.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn90.click();
    await page.waitForTimeout(300);
    // Click on the triangle to rotate it
    await interact(60, 65);
    await page.waitForTimeout(500);
    await page.screenshot({ path: shot('84c-pfeq-rotation-result.png'), fullPage: true });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── 85: Homothety tool (center + factor panel + result) ──
  await freshComplet();
  // Create a triangle
  await interact(40, 50);
  await page.waitForTimeout(250);
  await interact(70, 50);
  await page.waitForTimeout(250);
  await interact(55, 75);
  await page.waitForTimeout(250);
  await interact(40, 50);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Activate homothety tool
  await page.locator('[data-testid="tool-homothety"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('85a-pfeq-homothetie-idle.png'), fullPage: true });
  // Place center
  await interact(40, 50);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('85b-pfeq-homothetie-factor-panel.png'), fullPage: true });
  // Click ×2 preset button
  const btn2 = page.locator('button', { hasText: '×2' });
  if (await btn2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn2.click();
    await page.waitForTimeout(300);
    // Click on the triangle to scale it
    await interact(55, 62);
    await page.waitForTimeout(500);
    await page.screenshot({ path: shot('85c-pfeq-homothetie-result.png'), fullPage: true });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── 86: Toolbar in Complet mode (showing Rotation + Agrandir buttons) ──
  await freshComplet();
  await page.locator('[data-testid="toolbar"]').screenshot({ path: shot('86-toolbar-complet-new-tools.png') });

  // ── 87: Non-convex polygon (with label in properties panel) ──
  await freshComplet();
  // Create a concave quadrilateral (arrow shape)
  await interact(40, 50);
  await page.waitForTimeout(250);
  await interact(100, 70);
  await page.waitForTimeout(250);
  await interact(40, 90);
  await page.waitForTimeout(250);
  await interact(70, 70);
  await page.waitForTimeout(250);
  await interact(40, 50);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Open properties panel
  const panel87 = page.locator('[data-testid="properties-panel"]');
  if (await panel87.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('87-pfeq-non-convexe.png'), fullPage: true });
    await panel87.screenshot({ path: shot('87b-pfeq-non-convexe-panel.png') });
  }

  // ── 88: Regular pentagon (Pentagone régulier in Complet mode) ──
  await freshComplet();
  // Approximate regular pentagon
  await interact(80, 40);
  await page.waitForTimeout(250);
  await interact(99, 54);
  await page.waitForTimeout(250);
  await interact(92, 76);
  await page.waitForTimeout(250);
  await interact(68, 76);
  await page.waitForTimeout(250);
  await interact(61, 54);
  await page.waitForTimeout(250);
  await interact(80, 40);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel88 = page.locator('[data-testid="properties-panel"]');
  if (await panel88.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('88-pfeq-pentagone-regulier.png'), fullPage: true });
    await panel88.screenshot({ path: shot('88b-pfeq-pentagone-regulier-panel.png') });
  }

  // ── 89: Chord detection (segment on circle circumference) ──
  await freshComplet();
  await page.locator('[data-testid="tool-circle"]').click();
  await page.waitForTimeout(200);
  // Create circle: center at (80, 70), click edge at (110, 70) → radius ~30mm
  await interact(80, 70);
  await page.waitForTimeout(300);
  await interact(110, 70);
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Switch to segment tool and draw a chord
  await page.locator('[data-testid="tool-segment"]').click();
  await page.waitForTimeout(200);
  await interact(80, 40);
  await page.waitForTimeout(250);
  await interact(80, 100);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel89 = page.locator('[data-testid="properties-panel"]');
  if (await panel89.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('89-pfeq-corde-cercle.png'), fullPage: true });
    await panel89.screenshot({ path: shot('89b-pfeq-corde-cercle-panel.png') });
  }

  // ── 90: Focus mode active — dimmed non-adjacent elements ──
  await freshComplet();
  // Create 2 disconnected segments
  await interact(30, 50);
  await page.waitForTimeout(250);
  await interact(70, 50);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await interact(30, 100);
  await page.waitForTimeout(250);
  await interact(70, 100);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Enable focus mode in settings
  const settingsBtn90 = page.locator('[data-testid="settings-button"]');
  await settingsBtn90.click();
  await page.waitForTimeout(300);
  const focusToggle = page.locator('text=Mode focus').locator('..').locator('input[type="checkbox"]');
  if (await focusToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
    await focusToggle.click({ force: true });
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Select first segment (use move tool to select)
  await page.locator('[data-testid="tool-move"]').click();
  await interact(50, 50);
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('90-focus-mode-active.png'), fullPage: true });
  // Disable focus mode
  await settingsBtn90.click();
  await page.waitForTimeout(300);
  if (await focusToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
    await focusToggle.click({ force: true });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── 91: Reinforced grid — before/after ──
  await freshComplet();
  await page.screenshot({ path: shot('91a-grid-normal.png'), fullPage: true });
  const settingsBtn91 = page.locator('[data-testid="settings-button"]');
  await settingsBtn91.click();
  await page.waitForTimeout(300);
  const gridToggle = page.locator('text=Grille renforcée').locator('..').locator('input[type="checkbox"]');
  if (await gridToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
    await gridToggle.click({ force: true });
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('91b-grid-reinforced.png'), fullPage: true });
  // Disable
  await settingsBtn91.click();
  await page.waitForTimeout(300);
  if (await gridToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
    await gridToggle.click({ force: true });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── 92: Axes de symétrie as property — square with diagonal ──
  await freshComplet();
  // Create a square
  await interact(50, 50);
  await page.waitForTimeout(250);
  await interact(90, 50);
  await page.waitForTimeout(250);
  await interact(90, 90);
  await page.waitForTimeout(250);
  await interact(50, 90);
  await page.waitForTimeout(250);
  await interact(50, 50);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Add diagonal (potential symmetry axis)
  await interact(50, 50);
  await page.waitForTimeout(250);
  await interact(90, 90);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const panel92 = page.locator('[data-testid="properties-panel"]');
  if (await panel92.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('92-symmetry-axis-property.png'), fullPage: true });
    await panel92.screenshot({ path: shot('92b-symmetry-axis-panel.png') });
  }

  // ── 93: Angle droit + hideProperties ──
  await freshComplet();
  // Create right angle
  await interact(50, 50);
  await page.waitForTimeout(250);
  await interact(50, 90);
  await page.waitForTimeout(250);
  await interact(90, 90);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('93a-right-angle-visible.png'), fullPage: true });
  // Enable hideProperties
  const hideToggle = page.locator('[data-testid="hide-properties-toggle"]');
  if (await hideToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hideToggle.click({ force: true });
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('93b-right-angle-with-hide-properties.png'), fullPage: true });
    // Disable hideProperties
    await hideToggle.click({ force: true });
    await page.waitForTimeout(200);
  }

  // ── 94: Settings dialog showing all new toggles ──
  await freshComplet();
  const settingsBtn94 = page.locator('[data-testid="settings-button"]');
  await settingsBtn94.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('94-settings-new-toggles.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
});

// --- Separate test: iPad landscape layout ---
test('visual conformity — iPad landscape', async ({ page, browserName }, testInfo) => {
  // Only run on Mobile iPad project
  if (testInfo.project.name !== 'Mobile iPad') return;

  // Set landscape viewport
  await page.setViewportSize({ width: 1194, height: 834 });

  const dir = path.join(SCREENSHOT_BASE, 'mobile-ipad-landscape');
  await fs.mkdir(dir, { recursive: true });
  const shot = (name: string) => path.join(dir, name);

  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(300);

  // --- 58: iPad landscape initial state ---
  await page.screenshot({ path: shot('58-ipad-landscape-initial.png'), fullPage: true });

  // Create a triangle for context
  const interact = (xMm: number, yMm: number) => interactCanvas(page, testInfo, xMm, yMm);
  await interact(60, 40);
  await page.waitForTimeout(300);
  await interact(120, 40);
  await page.waitForTimeout(300);
  await interact(90, 80);
  await page.waitForTimeout(300);
  await interact(60, 40);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // --- 59: iPad landscape with construction ---
  await page.screenshot({ path: shot('59-ipad-landscape-construction.png'), fullPage: true });

  // --- 60: iPad landscape action bar ---
  await page.locator('[data-testid="action-bar"]').screenshot({ path: shot('60-ipad-landscape-action-bar.png') });
});
