import { test as setup, expect } from '@playwright/test';
import { login } from '../helpers/login';
import { authFile } from '../playwright.config';

setup('Auth', async ({ page }) => {
  await login(page, {
    username: process.env['PW_USERNAME'] ?? 'admin',
    password: process.env['PW_PASSWORD'] ?? 'pass',
  });
  await expect(page).toHaveURL(/manage|dashboard/);
  await page.context().storageState({ path: authFile });
});
