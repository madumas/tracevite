/**
 * Generate aide-mémoire screenshots with pixel-perfect element highlights.
 * Uses DOM bounding boxes — no hardcoded coordinates.
 *
 * Run: npx playwright test e2e/aide-memoire-screenshots.spec.ts --project='Desktop Chrome'
 * Output: docs/images/aide-memoire-*.png
 */
import { test, expect, type Page, type Locator } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'images');

/** Take a screenshot of a region around an element, with a highlight box. */
async function screenshotWithHighlight(
  page: Page,
  target: Locator,
  outFile: string,
  opts: {
    /** Extra padding around target for context (px) */
    contextPadding?: { top?: number; right?: number; bottom?: number; left?: number };
    /** Highlight color */
    color?: string;
    /** Highlight border width */
    width?: number;
  } = {},
) {
  const pad = {
    top: opts.contextPadding?.top ?? 20,
    right: opts.contextPadding?.right ?? 20,
    bottom: opts.contextPadding?.bottom ?? 20,
    left: opts.contextPadding?.left ?? 20,
  };
  const color = opts.color ?? '#C82828';
  const bw = opts.width ?? 3;

  // Get target bounding box
  const box = await target.boundingBox();
  if (!box) throw new Error('Target element not visible');

  // Get viewport size
  const viewport = page.viewportSize()!;

  // Calculate clip region with context padding, clamped to viewport
  const clip = {
    x: Math.max(0, box.x - pad.left),
    y: Math.max(0, box.y - pad.top),
    width: Math.min(viewport.width - Math.max(0, box.x - pad.left), box.width + pad.left + pad.right),
    height: Math.min(viewport.height - Math.max(0, box.y - pad.top), box.height + pad.top + pad.bottom),
  };

  // Inject a temporary highlight overlay via DOM
  const overlayId = 'aide-memoire-highlight';
  await page.evaluate(
    ({ box, clip, color, bw, overlayId }) => {
      // Remove previous overlay if any
      document.getElementById(overlayId)?.remove();

      const div = document.createElement('div');
      div.id = overlayId;
      div.style.cssText = `
        position: fixed;
        left: ${box.x - bw}px;
        top: ${box.y - bw}px;
        width: ${box.width + bw * 2}px;
        height: ${box.height + bw * 2}px;
        border: ${bw}px solid ${color};
        border-radius: 6px;
        pointer-events: none;
        z-index: 99999;
      `;
      document.body.appendChild(div);
    },
    { box, clip, color, bw, overlayId },
  );

  // Take screenshot of the clipped region
  await page.screenshot({ path: outFile, clip });

  // Clean up overlay
  await page.evaluate((id) => document.getElementById(id)?.remove(), overlayId);
}

test.describe('Aide-mémoire screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');
  });

  test('generate all aide-mémoire images', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'screenshots on desktop only');

    // ─── 1. TRACER ───
    // Create a segment
    await clickCanvas(page, 60, 100);
    await waitForStatus(page, /deuxième point/);
    await clickCanvas(page, 160, 100);
    await expectSegmentCount(page, 1);

    // Screenshot the segment on canvas
    // Find both point labels to define the segment region
    const pointLabels = page.locator('[data-testid="point-layer"] text');
    await expect(pointLabels.first()).toBeVisible({ timeout: 3000 });
    // Use the point-layer as bounding reference (contains points + labels)
    const pointLayer = page.locator('[data-testid="point-layer"]');
    const segment = pointLayer;
    await screenshotWithHighlight(page, pointLayer, path.join(OUT, 'aide-memoire-tracer.png'), {
      contextPadding: { top: 20, bottom: 30, left: 30, right: 30 },
      color: '#0a7e7a',
    });

    // ─── 2. OUPS! (Annuler) ───
    // The Annuler button is in the action bar, always visible after creating something
    const annulerBtn = page.locator('[data-testid="action-undo"]');
    await expect(annulerBtn).toBeVisible();
    // Show wider context: include Rétablir next to it
    const retablirBtn = page.locator('[data-testid="action-redo"]');
    const annulerBox = await annulerBtn.boundingBox();
    const retablirBox = await retablirBtn.boundingBox();
    if (annulerBox && retablirBox) {
      // Use annuler as target but expand right to include rétablir
      await screenshotWithHighlight(page, annulerBtn, path.join(OUT, 'aide-memoire-annuler.png'), {
        contextPadding: {
          top: 12,
          bottom: 12,
          left: 15,
          right: retablirBox.x + retablirBox.width - annulerBox.x - annulerBox.width + 15,
        },
      });
    }

    // ─── 3. DÉPLACER ───
    // Show the Déplacer tool button in the toolbar
    const deplacerBtn = page.locator('[data-testid="tool-move"]');
    await expect(deplacerBtn).toBeVisible();
    // Include Sélectionner next to it for context
    const selectBtn = page.locator('[data-testid="tool-select"]');
    const selectBox = await selectBtn.boundingBox();
    const deplacerBox = await deplacerBtn.boundingBox();
    if (selectBox && deplacerBox) {
      await screenshotWithHighlight(page, deplacerBtn, path.join(OUT, 'aide-memoire-deplacer.png'), {
        contextPadding: {
          top: 8,
          bottom: 8,
          left: deplacerBox.x - selectBox.x + 15,
          right: 15,
        },
      });
    }

    // ─── 4. SUPPRIMER ───
    // Select a segment to show context action bar with Supprimer
    await selectTool(page, 'select');
    await clickCanvas(page, 110, 100);

    const contextBar = page.locator('[data-testid="context-action-bar"]');
    await expect(contextBar).toBeVisible({ timeout: 3000 });
    const deleteBtn = page.locator('[data-testid="context-delete"]');
    await expect(deleteBtn).toBeVisible();
    await expect(deleteBtn).toHaveText('Supprimer');

    // Screenshot showing the context bar floating above the selected segment
    // Crop a region that includes both the segment and the context bar
    const contextBox = await contextBar.boundingBox();
    const segBox = await segment.boundingBox();
    if (contextBox && segBox) {
      // Create a virtual bounding box that spans from context bar to segment
      const unionTop = Math.min(contextBox.y, segBox.y);
      const unionBottom = Math.max(contextBox.y + contextBox.height, segBox.y + segBox.height);
      const unionLeft = Math.min(contextBox.x, segBox.x);
      const unionRight = Math.max(contextBox.x + contextBox.width, segBox.x + segBox.width);

      const clip = {
        x: Math.max(0, unionLeft - 30),
        y: Math.max(0, unionTop - 20),
        width: unionRight - unionLeft + 60,
        height: unionBottom - unionTop + 40,
      };

      // Add highlight on delete button
      const delBox = await deleteBtn.boundingBox();
      if (delBox) {
        await page.evaluate(
          ({ box, color }) => {
            document.getElementById('aide-memoire-highlight')?.remove();
            const div = document.createElement('div');
            div.id = 'aide-memoire-highlight';
            div.style.cssText = `
              position: fixed;
              left: ${box.x - 3}px; top: ${box.y - 3}px;
              width: ${box.width + 6}px; height: ${box.height + 6}px;
              border: 3px solid ${color}; border-radius: 6px;
              pointer-events: none; z-index: 99999;
            `;
            document.body.appendChild(div);
          },
          { box: delBox, color: '#C82828' },
        );
      }

      await page.screenshot({ path: path.join(OUT, 'aide-memoire-supprimer.png'), clip });
      await page.evaluate(() => document.getElementById('aide-memoire-highlight')?.remove());
    }
  });
});
