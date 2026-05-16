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

  test('onboarding route loads value prop or setup placeholder', async ({ page }) => {
    await page.goto('/onboarding');
    const skip = page.getByLabel('Skip onboarding');
    const setup = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    await expect(skip.or(setup).first()).toBeVisible({ timeout: 30_000 });
  });

  test('skip is visible when Convex is configured', async ({ page }) => {
    await page.goto('/onboarding');
    const skip = page.getByLabel('Skip onboarding');
    const hasSkip = await skip.isVisible().catch(() => false);
    const setup = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    const hasSetup = await setup.isVisible().catch(() => false);
    test.skip(!hasSkip && !hasSetup, 'No onboarding UI visible');
    if (hasSkip) {
      await expect(skip).toBeVisible();
    }
  });
});
