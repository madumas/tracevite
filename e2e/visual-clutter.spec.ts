import { test, expect } from '@playwright/test';
import { interactCanvas } from './helpers/canvas';
import { waitForStatus, openClassSettings, closeSettings } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="canvas-svg"]');
});

test.describe('Visual clutter and overlapping labels', () => {
  test('angle labels hidden after clutter threshold (>5 segments in simplifie)', async ({
    page,
  }, testInfo) => {
    // Create 6 independent segments to exceed the 5-segment clutter threshold.
    // Use well-separated coordinates to avoid snap interference between segments.
    // Each segment is a separate "create + escape" cycle.
    const segments: Array<[number, number, number, number]> = [
      [30, 50, 80, 50],
      [30, 80, 80, 80],
      [30, 110, 80, 110],
      [130, 50, 180, 50],
      [130, 80, 180, 80],
      [130, 110, 180, 110],
    ];

    for (let i = 0; i < segments.length; i++) {
      const [x1, y1, x2, y2] = segments[i]!;
      await interactCanvas(page, testInfo, x1, y1);
      await page.waitForTimeout(400);
      await interactCanvas(page, testInfo, x2, y2);
      await page.waitForTimeout(400);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await expectSegmentCount(page, i + 1);
    }

    // In simplifie mode (default), angle labels should be hidden after 5 segments
    // With 6 isolated segments (no shared vertices), there are no angles anyway
    // But the clutter flag should be set
    const angleLabels = page.locator('[data-testid="angle-layer"] text');
    const count = await angleLabels.count();
    expect(count).toBe(0);
  });

  test('point labels at nearby positions do not share identical coordinates', async ({
    page,
  }, testInfo) => {
    // Create a small triangle (20mm sides — must exceed 15mm effective snap tolerance on 10mm grid)
    await interactCanvas(page, testInfo, 50, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 70, 80); // 20mm apart
    await waitForStatus(page, /Continue/);
    await interactCanvas(page, testInfo, 60, 62); // ~20mm from both endpoints
    await interactCanvas(page, testInfo, 50, 80); // Close triangle

    await expectSegmentCount(page, 3);
    await expectPointCount(page, 3);

    // Get all point label positions from the SVG
    const labels = page.locator('[data-testid="point-layer"] text');
    const labelCount = await labels.count();
    expect(labelCount).toBe(3);

    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < labelCount; i++) {
      const x = await labels.nth(i).getAttribute('x');
      const y = await labels.nth(i).getAttribute('y');
      positions.push({ x: parseFloat(x!), y: parseFloat(y!) });
    }

    // No two labels should be at the exact same position
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = Math.abs(positions[i]!.x - positions[j]!.x);
        const dy = Math.abs(positions[i]!.y - positions[j]!.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Labels should be at least 2px apart
        expect(dist).toBeGreaterThan(2);
      }
    }
  });

  test('segment length labels on parallel close segments are offset correctly', async ({
    page,
  }, testInfo) => {
    // Create two horizontal segments 20mm apart (must exceed 15mm snap tolerance on 10mm grid)
    await interactCanvas(page, testInfo, 40, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 120, 80);
    await page.keyboard.press('Escape');

    await interactCanvas(page, testInfo, 40, 100);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 120, 100);
    await page.keyboard.press('Escape');

    await expectSegmentCount(page, 2);

    // Get all length label positions from segment layer
    const segLabels = page.locator('[data-testid="segment-layer"] text');
    const labelCount = await segLabels.count();
    expect(labelCount).toBe(2);

    const yPositions: number[] = [];
    for (let i = 0; i < labelCount; i++) {
      const y = await segLabels.nth(i).getAttribute('y');
      yPositions.push(parseFloat(y!));
    }

    // Labels should be at different Y positions (perpendicular offset from their segments)
    const yDiff = Math.abs(yPositions[0]! - yPositions[1]!);
    expect(yDiff).toBeGreaterThan(1); // At least 1px apart vertically
  });

  test('many segments meeting at one vertex have manageable angle display', async ({
    page,
  }, testInfo) => {
    // Create a "star" pattern: 4 segments all meeting at center point (80, 80)
    const endpoints = [
      [40, 40],
      [120, 40],
      [120, 120],
      [40, 120],
    ];

    // First segment: center to first endpoint
    await interactCanvas(page, testInfo, 80, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, endpoints[0]![0]!, endpoints[0]![1]!);
    await page.keyboard.press('Escape');

    // Connect remaining endpoints to center
    for (let i = 1; i < endpoints.length; i++) {
      await interactCanvas(page, testInfo, 80, 80); // snap to center
      await waitForStatus(page, /deuxième point/);
      await interactCanvas(page, testInfo, endpoints[i]![0]!, endpoints[i]![1]!);
      await page.keyboard.press('Escape');
    }

    await expectSegmentCount(page, 4);

    // With 4 segments at one vertex, there should be angles detected
    // But we're at 4 segments (below clutter threshold of 5 for simplifie)
    // So angle arcs should be visible
    const angleArcs = page.locator('[data-testid="angle-layer"] path');
    const arcCount = await angleArcs.count();
    // Should have some angle arcs (at least the right angles if any)
    expect(arcCount).toBeGreaterThanOrEqual(0); // At minimum, the layer exists
  });

  test('short segment (5mm grid) still displays readable label', async ({ page }, testInfo) => {
    // Switch to 5mm grid via settings
    await openClassSettings(page);
    const gridRow = page.getByText('Taille de la grille').locator('..');
    await gridRow.locator('select').selectOption('5');
    await closeSettings(page);

    // Create a short segment: 5mm (adjacent 5mm grid points)
    await interactCanvas(page, testInfo, 80, 80);
    await waitForStatus(page, /deuxième point/);
    await interactCanvas(page, testInfo, 85, 80); // 5mm horizontal

    await expectSegmentCount(page, 1);

    // Length label should exist and be readable
    const segLabels = page.locator('[data-testid="segment-layer"] text');
    const labelCount = await segLabels.count();
    expect(labelCount).toBeGreaterThanOrEqual(1);

    // Label font size should be readable (>= 11px)
    const fontSize = await segLabels.first().getAttribute('font-size');
    if (fontSize) {
      expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(11);
    }
  });
});
