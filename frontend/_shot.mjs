import { chromium } from '@playwright/test';

const OUT =
  '/private/tmp/claude-501/-Users-carl-GitHub-open-msupply-frontend/f51ef8d9-f8db-4abe-a9df-9d8d08bc7408/scratchpad';
const URL = 'http://localhost:3005/#/showcase/buttons';
const EXEC =
  '/Users/carl/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Open the first status-change menu (3 items → shows dividers + current item).
const caret = page.getByRole('button', { name: 'Change status' }).first();
await caret.scrollIntoViewIfNeeded();
await caret.click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/menu-light.png` });

// Dark.
await page.evaluate(() =>
  document.documentElement.setAttribute('data-theme', 'dark')
);
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/menu-dark.png` });

console.log('done');
await browser.close();
