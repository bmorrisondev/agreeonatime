import { expect, test } from '@playwright/test';

test.describe('sign-in', () => {
  test('route loads and shows sign-in form or Convex setup message', async ({ page }) => {
    await page.goto('/sign-in');
    const signInVisible = page.getByText('Agree on a Time');
    const setupVisible = page.getByText(/EXPO_PUBLIC_CONVEX_URL/);
    await expect(signInVisible.or(setupVisible).first()).toBeVisible({ timeout: 30_000 });
  });

  test('email and password fields are visible in sign-in mode', async ({ page }) => {
    await page.goto('/sign-in');
    const heading = page.getByText('Agree on a Time');
    const hasHeading = await heading.isVisible().catch(() => false);
    test.skip(!hasHeading, 'Convex URL not configured — screen shows setup placeholder');

    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByLabel('Sign in with password')).toBeVisible();
  });

  test('can switch to sign-up mode and see name field', async ({ page }) => {
    await page.goto('/sign-in');
    const heading = page.getByText('Agree on a Time');
    const hasHeading = await heading.isVisible().catch(() => false);
    test.skip(!hasHeading, 'Convex URL not configured — screen shows setup placeholder');

    await page.getByLabel('Switch to create account').click();
    await expect(page.getByLabel('Your name')).toBeVisible();
    await expect(page.getByText('Create an account to get started.')).toBeVisible();
  });

  test('can switch to magic link mode', async ({ page }) => {
    await page.goto('/sign-in');
    const heading = page.getByText('Agree on a Time');
    const hasHeading = await heading.isVisible().catch(() => false);
    test.skip(!hasHeading, 'Convex URL not configured — screen shows setup placeholder');

    await page.getByLabel('Switch to magic link').click();
    await expect(page.getByText('Email me a magic link')).toBeVisible();
  });

  test('sign-in button is disabled without valid input', async ({ page }) => {
    await page.goto('/sign-in');
    const heading = page.getByText('Agree on a Time');
    const hasHeading = await heading.isVisible().catch(() => false);
    test.skip(!hasHeading, 'Convex URL not configured — screen shows setup placeholder');

    const signInButton = page.getByLabel('Sign in with password');
    await expect(signInButton).toBeDisabled();
  });
});
