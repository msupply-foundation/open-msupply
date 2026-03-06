import { Page } from '@playwright/test';

interface LoginOptions {
  username?: string;
  password?: string;
}

export async function login(page: Page, options: LoginOptions = {}) {
  const { username = 'admin', password = 'pass' } = options;

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const usernameInput = page.locator('input[type="text"]').first();
  await usernameInput.fill(username);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  const loginButton = page.locator('button:has-text("Log in")').first();
  await loginButton.click();

  await page.waitForURL(/manage|dashboard/, { timeout: 10000 });
  await page.waitForTimeout(1000);
}
