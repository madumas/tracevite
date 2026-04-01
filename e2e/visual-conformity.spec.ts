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

  // --- 19: "Nouvelle construction" confirmation dialog ---
  await page.locator('[data-testid="action-new"]').click();
  const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
  if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: shot('19-new-confirm-dialog.png'), fullPage: true });
    await confirmDialog.screenshot({ path: shot('19b-new-confirm-detail.png') });
    // Cancel — don't erase the construction
    await page.locator('[data-testid="confirm-dialog-cancel"]').click();
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
  await page.goto('/?consigne=Construis%20un%20triangle%20rectangle%20dont%20l%27hypot%C3%A9nuse%20mesure%207%20cm.');
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
});
