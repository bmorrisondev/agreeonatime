import { expect, test } from '@playwright/test';

test.describe('vote landing', () => {
  test('share link route loads or shows setup / not found', async ({ page }) => {
    await page.goto('/vote/abc123def456');
    const configured = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    const loading = page.getByLabel('Loading event');
    const notFound = page.getByText(/does not match an event|invalid/i);
    const voteUi = page.getByText(/Your name|Times/i);
    await expect(configured.or(loading).or(notFound).or(voteUi).first()).toBeVisible({ timeout: 30_000 });
  });
});
