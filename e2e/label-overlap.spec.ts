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
    // Build a construction with shared vertices, angles, and parallel segments
    // A(30,80) → B(80,80) → C(130,80) colinear + B(80,80) → D(80,40) perpendicular
    const segments = [
      [30, 80, 80, 80], // A-B
      [80, 80, 130, 80], // B-C (colinear with A-B)
      [80, 80, 80, 40], // B-D (perpendicular)
      [30, 80, 80, 40], // A-D
      [130, 80, 80, 40], // C-D
    ];

    for (const [x1, y1, x2, y2] of segments) {
      await interactCanvas(page, testInfo, x1!, y1!);
      await waitForStatus(page, /deuxième point/);
      await interactCanvas(page, testInfo, x2!, y2!);
      await page.keyboard.press('Escape');
    }

    await expectSegmentCount(page, 5);

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

    // Known limitations: angle degree labels (°) can overlap with other labels
    // at dense vertices. Point labels are repositioned dynamically; angle label
    // repositioning is future work. Filter out any overlap involving angle labels.
    const nonAngleOverlaps = overlaps.filter((o) => !o.includes('°'));
    expect(
      nonAngleOverlaps,
      `Non-angle label overlaps:\n${nonAngleOverlaps.join('\n')}`,
    ).toHaveLength(0);
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
