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
import { waitForStatus, clickAction } from './helpers/toolbar';
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
});
