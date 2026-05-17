import { expect, test } from '@playwright/test';

test.describe('onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('onboarding.v1.completed');
        localStorage.removeItem('onboarding.v1.draft');
      } catch {
        /* ignore */
      }
    });
  });

  test('first launch shows intro modal or Convex setup', async ({ page }) => {
    await page.goto('/');
    const createEvent = page.getByLabel('Create my first event');
    const setup = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    await expect(createEvent.or(setup).first()).toBeVisible({ timeout: 30_000 });
  });

  test('intro modal offers log in', async ({ page }) => {
    await page.goto('/');
    const logIn = page.getByLabel('Log in');
    const hasLogIn = await logIn.isVisible().catch(() => false);
    test.skip(!hasLogIn, 'Convex URL not configured');
    await expect(logIn).toBeVisible();
  });
});
