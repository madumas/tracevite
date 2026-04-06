/**
 * Generate guide-enseignant screenshots with clean, simple constructions.
 *
 * Run: npx playwright test e2e/guide-enseignant-screenshots.spec.ts --project='Desktop Chrome'
 * Output: docs/images/guide-*.png
 */
import { test, expect } from '@playwright/test';
import { clickCanvas } from './helpers/canvas';
import { selectTool, waitForStatus } from './helpers/toolbar';
import { expectSegmentCount, expectPointCount } from './helpers/assertions';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'images');

test.describe('Guide enseignant screenshots', () => {
  test('page 1: vue ensemble, mode, barre de statut', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'desktop only');

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // ─── Vue d'ensemble : interface initiale avec barre de statut visible ───
    await page.screenshot({ path: path.join(OUT, 'guide-vue-ensemble.png') });

    // ─── Mode selector ouvert ───
    const modeBtn = page.locator('[data-testid="mode-selector"]');
    await modeBtn.click();
    await page.waitForTimeout(300);

    // Crop the top-right area showing the dropdown
    const modeBtnBox = await modeBtn.boundingBox();
    if (modeBtnBox) {
      // Wide enough to see both options with full description text
      await page.screenshot({
        path: path.join(OUT, 'guide-mode-selector.png'),
        clip: {
          x: modeBtnBox.x - 280,
          y: 0,
          width: modeBtnBox.width + 310,
          height: 230,
        },
      });
    }

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // ─── Barre de statut avec instruction ───
    const statusBar = page.locator('[data-testid="status-bar"]');
    const statusBox = await statusBar.boundingBox();
    if (statusBox) {
      await page.screenshot({
        path: path.join(OUT, 'guide-barre-statut.png'),
        clip: {
          x: 0,
          y: statusBox.y - 2,
          width: Math.min(900, page.viewportSize()!.width),
          height: statusBox.height + 4,
        },
      });
    }
  });

  test('page 1: segment tracé avec mesure', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'desktop only');

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Create two segments via chaining (V shape)
    await clickCanvas(page, 50, 120);
    await waitForStatus(page, /deuxième/);
    await clickCanvas(page, 110, 70);
    await expectSegmentCount(page, 1);
    await waitForStatus(page, /Continue/);
    await clickCanvas(page, 170, 120);
    await expectSegmentCount(page, 2);

    // Escape chaining
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Screenshot: clean construction with measurements visible
    await page.screenshot({ path: path.join(OUT, 'guide-construction-simple.png') });
  });

  test('page 2: menu partager', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'desktop only');

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Create a segment so the share has content
    await clickCanvas(page, 60, 100);
    await waitForStatus(page, /deuxième/);
    await clickCanvas(page, 160, 100);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Click Partager button to open menu
    const partagerBtn = page.locator('[data-testid="action-share"]');
    await expect(partagerBtn).toBeVisible();
    await partagerBtn.click();
    await page.waitForTimeout(300);

    // Find the share popup menu
    const shareMenu = page.locator('[data-testid="share-menu"]');
    const menuVisible = await shareMenu.isVisible().catch(() => false);

    if (menuVisible) {
      const menuBox = await shareMenu.boundingBox();
      const btnBox = await partagerBtn.boundingBox();
      if (menuBox && btnBox) {
        const top = Math.min(menuBox.y, btnBox.y) - 10;
        const left = Math.min(menuBox.x, btnBox.x) - 15;
        const right = Math.max(menuBox.x + menuBox.width, btnBox.x + btnBox.width) + 15;
        const bottom = Math.max(menuBox.y + menuBox.height, btnBox.y + btnBox.height) + 10;
        await page.screenshot({
          path: path.join(OUT, 'guide-partager-menu.png'),
          clip: { x: left, y: top, width: right - left, height: bottom - top },
        });
      }
    } else {
      // Fallback: screenshot the bottom-right area where Partager lives
      const btnBox = await partagerBtn.boundingBox();
      if (btnBox) {
        await page.screenshot({
          path: path.join(OUT, 'guide-partager-menu.png'),
          clip: {
            x: btnBox.x - 50,
            y: btnBox.y - 150,
            width: 350,
            height: 200,
          },
        });
      }
    }

    // Close menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('page 2: masquer les propriétés', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'desktop only');

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Switch to Complet mode for richer display
    const modeBtn = page.locator('[data-testid="mode-selector"]');
    await modeBtn.click();
    await page.waitForTimeout(200);
    const completOption = page.locator('text=Complet').first();
    await completOption.click();
    await page.waitForTimeout(300);

    // Create a rectangle (4 segments)
    await clickCanvas(page, 50, 70);
    await waitForStatus(page, /deuxième/);
    await clickCanvas(page, 130, 70);
    await waitForStatus(page, /Continue/);
    await clickCanvas(page, 130, 120);
    await waitForStatus(page, /Continue/);
    await clickCanvas(page, 50, 120);
    await waitForStatus(page, /Continue/);
    await clickCanvas(page, 50, 70);
    await expectSegmentCount(page, 4);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Toggle "Masquer les propriétés" in properties panel
    const hideToggle = page.locator('[data-testid="hide-properties-toggle"]');
    // The panel might need to open first — click on a segment to select
    await selectTool(page, 'select');
    await clickCanvas(page, 90, 70);
    await page.waitForTimeout(300);

    // Screenshot with properties visible (before hiding)
    await page.screenshot({ path: path.join(OUT, 'guide-proprietes-visibles.png') });

    // Now check the hide toggle if visible
    const toggleVisible = await hideToggle.isVisible().catch(() => false);
    if (toggleVisible) {
      await hideToggle.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, 'guide-proprietes-masquees.png') });
    }
  });

  test('page 2: mode estimation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'desktop only');

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Create two segments
    await clickCanvas(page, 50, 120);
    await waitForStatus(page, /deuxième/);
    await clickCanvas(page, 110, 70);
    await expectSegmentCount(page, 1);
    await waitForStatus(page, /Continue/);
    await clickCanvas(page, 170, 120);
    await expectSegmentCount(page, 2);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Enable estimation mode via settings
    const settingsBtn = page.locator('[data-testid="settings-button"]');
    await settingsBtn.click();
    await page.waitForTimeout(300);

    // Open "Paramètres de classe" accordion
    const classeHeader = page.locator('text=Paramètres de classe');
    const classeVisible = await classeHeader.isVisible().catch(() => false);
    if (classeVisible) {
      await classeHeader.click();
      await page.waitForTimeout(200);
    }

    // Toggle estimation mode
    const estimationToggle = page.locator('text=Mode estimation');
    const estVisible = await estimationToggle.isVisible().catch(() => false);
    if (estVisible) {
      await estimationToggle.click();
      await page.waitForTimeout(200);
    }

    // Close settings
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Screenshot: estimation mode active (measures hidden)
    await page.screenshot({ path: path.join(OUT, 'guide-estimation-active.png') });
  });

  test('page 2: profils rapides dans paramètres', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chrome', 'desktop only');

    await page.goto('/');
    await page.waitForSelector('[data-testid="canvas-svg"]');

    // Open settings
    const settingsBtn = page.locator('[data-testid="settings-button"]');
    await settingsBtn.click();
    await page.waitForTimeout(300);

    // Find the settings dialog
    const dialog = page.locator('[data-testid="settings-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Screenshot just the settings dialog
    const dialogContent = dialog.locator('div').first();
    const dialogBox = await dialogContent.boundingBox();
    if (dialogBox) {
      await page.screenshot({
        path: path.join(OUT, 'guide-profils-rapides.png'),
        clip: {
          x: dialogBox.x - 5,
          y: dialogBox.y - 5,
          width: dialogBox.width + 10,
          height: Math.min(dialogBox.height + 10, 450),
        },
      });
    }
  });
});
