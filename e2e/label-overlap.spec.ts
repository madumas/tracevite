import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus } from './helpers/toolbar';
import { expectSegmentCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
  // Switch to complet mode to see angle degree labels
  await page.locator('[data-testid="mode-selector"]').click();
  await page.locator('[data-testid="mode-option-complet"]').click();
});

test.describe('Label overlap detection', () => {
  test('no text labels overlap > 30% on a dense construction', async ({ page }, testInfo) => {
    // Dense construction: star 3 branches + closed triangle = 6 segments (= complet clutter threshold)
    const segments = [
      [80, 80, 40, 40], // center → upper-left
      [80, 80, 120, 40], // center → upper-right
      [80, 80, 80, 130], // center → bottom
      [40, 40, 120, 40], // top edge
      [120, 40, 80, 130], // right edge
      [80, 130, 40, 40], // left edge (closes triangle)
    ];

    for (const [x1, y1, x2, y2] of segments) {
      await interactCanvas(page, testInfo, x1!, y1!);
      await waitForStatus(page, /deuxième point/);
      await interactCanvas(page, testInfo, x2!, y2!);
      await page.keyboard.press('Escape');
    }

    await expectSegmentCount(page, 6);

    // Read all visible text bounding boxes from the SVG
    const boxes = await page.evaluate(() => {
      const selectors = [
        '[data-testid="point-layer"] text',
        '[data-testid="angle-layer"] text',
        '[data-testid="segment-layer"] text',
      ];
      const results: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
      }> = [];

      for (const sel of selectors) {
        const texts = document.querySelectorAll(sel);
        for (const el of texts) {
          const svgEl = el as SVGTextElement;
          const bbox = svgEl.getBBox();
          if (bbox.width > 0 && bbox.height > 0) {
            results.push({
              x: bbox.x,
              y: bbox.y,
              width: bbox.width,
              height: bbox.height,
              text: svgEl.textContent ?? '',
            });
          }
        }
      }
      return results;
    });

    // Verify we have some labels
    expect(boxes.length).toBeGreaterThan(0);

    // Check pairwise overlap
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlapX = Math.max(
          0,
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
        );
        const overlapY = Math.max(
          0,
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
        );
        const overlapArea = overlapX * overlapY;
        const smallerArea = Math.min(a.width * a.height, b.width * b.height);
        const ratio = smallerArea > 0 ? overlapArea / smallerArea : 0;

        if (ratio > 0.3) {
          overlaps.push(
            `"${a.text}" and "${b.text}" overlap by ${Math.round(ratio * 100)}%`,
          );
        }
      }
    }

    // After filtering reflex angles, all remaining labels should not overlap > 30%
    expect(overlaps, `Label overlaps detected:\n${overlaps.join('\n')}`).toHaveLength(0);
  });

  test('no reflex angle (>180°) is displayed at a vertex with 3+ segments', async ({
    page,
  }, testInfo) => {
    // Create 3 segments meeting at B(80,80): A-B, B-C, B-D
    // This creates angles at B, one of which is reflex (>180°)
    const segments = [
      [30, 80, 80, 80], // A-B
      [80, 80, 130, 80], // B-C
      [80, 80, 80, 30], // B-D
    ];

    for (const [x1, y1, x2, y2] of segments) {
      await interactCanvas(page, testInfo, x1!, y1!);
      await waitForStatus(page, /deuxième point/);
      await interactCanvas(page, testInfo, x2!, y2!);
      await page.keyboard.press('Escape');
    }

    // Read all angle labels — none should show a value > 180
    const angleTexts = await page.evaluate(() => {
      const texts = document.querySelectorAll('[data-testid="angle-layer"] text');
      return Array.from(texts).map((el) => el.textContent ?? '');
    });

    for (const text of angleTexts) {
      const degrees = parseInt(text.replace('°', ''));
      if (!isNaN(degrees)) {
        expect(degrees, `Reflex angle "${text}" should not be displayed`).toBeLessThanOrEqual(180);
      }
    }
  });

  test('point labels near shared vertex are not at identical positions', async ({
    page,
  }, testInfo) => {
    // Create a star pattern: 3 segments meeting at center (80, 80)
    const endpoints = [
      [40, 50],
      [120, 50],
      [80, 120],
    ];

    for (const [ex, ey] of endpoints) {
      await interactCanvas(page, testInfo, 80, 80);
      await waitForStatus(page, /deuxième point/);
      await interactCanvas(page, testInfo, ex!, ey!);
      await page.keyboard.press('Escape');
    }

    // Get point label positions
    const labels = await page.evaluate(() => {
      const texts = document.querySelectorAll('[data-testid="point-layer"] text');
      return Array.from(texts).map((el) => {
        const bbox = (el as SVGTextElement).getBBox();
        return {
          text: el.textContent,
          cx: bbox.x + bbox.width / 2,
          cy: bbox.y + bbox.height / 2,
        };
      });
    });

    // No two label centers should be within 5px of each other
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const dx = labels[i]!.cx - labels[j]!.cx;
        const dy = labels[i]!.cy - labels[j]!.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(
          dist,
          `Labels "${labels[i]!.text}" and "${labels[j]!.text}" centers only ${dist.toFixed(1)}px apart`,
        ).toBeGreaterThan(5);
      }
    }
  });
});
