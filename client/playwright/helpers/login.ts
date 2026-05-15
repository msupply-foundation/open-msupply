import { Page } from '@playwright/test';

interface LoginOptions {
  username?: string;
  password?: string;
}

export async function login(page: Page, options: LoginOptions = {}) {
  const { username = 'admin', password = 'pass' } = options;

  page.on('pageerror', err => {
    console.log(`  [pageerror] ${err.message}`);
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const usernameInput = page.locator('input[type="text"]').first();
  await usernameInput.fill(username);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  const loginButton = page.locator('button:has-text("Log in")').first();
  await loginButton.click();

  // Check for login UI errors before waiting for navigation
  const alert = page.locator('[role="alert"]');
  if (await alert.isVisible({ timeout: 2000 }).catch(() => false)) {
    const text = (await alert.textContent())?.trim();
    if (text) throw new Error(`Login failed: ${text}`);
  }

  await page.waitForURL(/manage|dashboard/, { timeout: 10000 });
  await page.waitForTimeout(1000);

  if (page.url().includes('/login')) {
    throw new Error('Redirected back to login after successful authentication');
  }
}
