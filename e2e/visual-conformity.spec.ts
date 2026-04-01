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
});
