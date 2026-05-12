import { expect, test } from '@playwright/test';

test.describe('vote landing', () => {
  test('share link route loads', async ({ page }) => {
    await page.goto('/vote/abc123def456');
    await expect(page.getByText('Vote on a time')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Go to home')).toBeVisible();
  });
});
