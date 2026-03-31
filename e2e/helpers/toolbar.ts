import type { Page } from '@playwright/test';

export type ToolName =
  | 'segment'
  | 'point'
  | 'move'
  | 'circle'
  | 'reflection'
  | 'reproduce'
  | 'perpendicular'
  | 'parallel'
  | 'translation'
  | 'measure';

export type ActionName = 'undo' | 'redo' | 'delete' | 'print' | 'new';

export async function selectTool(page: Page, tool: ToolName): Promise<void> {
  await page.locator(`[data-testid="tool-${tool}"]`).click();
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
