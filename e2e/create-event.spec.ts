import { expect, test } from '@playwright/test';

test.describe('create-event', () => {
  test('route loads and shows form or Convex setup message', async ({ page }) => {
    await page.goto('/create-event');
    const formVisible = page.getByText('Title', { exact: true });
    const setupVisible = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    await expect(formVisible.or(setupVisible).first()).toBeVisible({ timeout: 30_000 });
  });

  test('title field accepts input when Convex is configured', async ({ page }) => {
    await page.goto('/create-event');
    const titleField = page.getByLabel('Event title');
    const hasField = await titleField.isVisible().catch(() => false);
    test.skip(!hasField, 'Convex URL not configured — screen shows setup placeholder');
    await titleField.fill('E2E picnic');
    await expect(titleField).toHaveValue('E2E picnic');
  });
});
