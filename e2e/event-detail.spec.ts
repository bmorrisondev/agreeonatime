import { expect, test } from '@playwright/test';

test.describe('event detail', () => {
  test('route loads for placeholder id', async ({ page }) => {
    await page.goto('/event/test-event-id');
    const loading = page.getByLabel('Loading event');
    const setup = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    const body = page.getByText(/not found|Sign in|Convex URL|Delete event/i);
    await expect(loading.or(setup).or(body).first()).toBeVisible({ timeout: 30_000 });
  });
});
