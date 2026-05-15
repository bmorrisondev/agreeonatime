import { expect, test } from '@playwright/test';

test.describe('settings tab', () => {
  test('route loads', async ({ page }) => {
    await page.goto('/(tabs)/settings');
    const accountSection = page.getByRole('header', { name: /account/i });
    const convexHint = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    const feedbackRow = page.getByText(/feedback/i);
    await expect(accountSection.or(convexHint).or(feedbackRow).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('/settings redirects to tab', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/settings/i, { timeout: 30_000 });
    const accountSection = page.getByRole('header', { name: /account/i });
    const convexHint = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    await expect(accountSection.or(convexHint).first()).toBeVisible({ timeout: 30_000 });
  });
});
