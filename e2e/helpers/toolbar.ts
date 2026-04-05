import type { Page } from '@playwright/test';

export type ToolName =
  | 'select'
  | 'segment'
  | 'point'
  | 'move'
  | 'circle'
  | 'reflection'
  | 'reproduce'
  | 'perpendicular'
  | 'parallel'
  | 'translation'
  | 'measure'
  | 'rotation'
  | 'homothety'
  | 'symmetry'
  | 'compare'
  | 'frieze';

export type ActionName = 'undo' | 'redo' | 'print' | 'new';

export async function selectTool(page: Page, tool: ToolName): Promise<void> {
  const toolBtn = page.locator(`[data-testid="tool-${tool}"]`);
  if (!(await toolBtn.isVisible().catch(() => false))) {
    // Tool may be behind "Plus d'outils" on narrow screens or in Simplifié mode
    const moreBtn = page.locator('[data-testid="more-tools"]');
    if (await moreBtn.isVisible().catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(200);
    }
  }
  await toolBtn.click();
}

export async function clickAction(page: Page, action: ActionName): Promise<void> {
  await page.locator(`[data-testid="action-${action}"]`).click();
}

export async function getStatusText(page: Page): Promise<string> {
  return (await page.locator('[data-testid="status-bar"]').textContent()) ?? '';
}

export async function waitForStatus(page: Page, text: string | RegExp): Promise<void> {
  const statusBar = page.locator('[data-testid="status-bar"]');
  if (typeof text === 'string') {
    await statusBar.filter({ hasText: text }).waitFor({ timeout: 5000 });
  } else {
    await statusBar.filter({ hasText: text }).waitFor({ timeout: 5000 });
  }
}

/**
 * Open Settings dialog and expand the "Paramètres de classe" accordion.
 * Returns the dialog locator for further interactions.
 */
export async function openClassSettings(page: Page) {
  await page.locator('[data-testid="settings-button"]').click();
  await page.locator('[data-testid="settings-dialog"]').waitFor();
  // Expand the accordion if it's closed
  const accordion = page.locator('button[aria-expanded="false"]', {
    hasText: 'Paramètres de classe',
  });
  if (await accordion.isVisible().catch(() => false)) {
    await accordion.click();
  }
  return page.locator('[data-testid="settings-dialog"]');
}

/** Close the settings dialog via the Fermer button. */
export async function closeSettings(page: Page) {
  const dialog = page.locator('[data-testid="settings-dialog"]');
  await dialog.locator('button[aria-label="Fermer"]').click();
  await dialog.waitFor({ state: 'hidden', timeout: 3000 });
}
