import { test as setup } from '@playwright/test';
import { login } from '../helpers/login';
import { authFile } from '../playwright.config';

setup('authenticate', async ({ page }) => {
  await login(page);
  await page.context().storageState({ path: authFile });
});
