import { test as setup, expect } from '@playwright/test';
import { login } from '../helpers/login';
import { authFile } from '../playwright.config';

setup('Auth', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/manage|dashboard/);
  await page.context().storageState({ path: authFile });
});
