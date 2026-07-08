/**
 * Stocktake regression suite.
 *
 * Source of truth: the OMS-REG-INV-03, OMS-REG-INV-04 and OMS-REG-SMV-01
 * regression cases in the (private) tmf-testing repo (behaviour-anchored format,
 * tmf-testing#11). Each test carries a `covers` annotation naming the behaviour
 * ID(s) it exercises; the coverage report is generated from those annotations
 * via the json reporter.
 *
 *   - OMS-REG-INV-03  Stocktake creation & item/batch management (detail view)
 *   - OMS-REG-INV-04  Stocktake finalisation & edit protection
 *   - OMS-REG-SMV-01  Stock/ledger effects of finalising a stocktake
 *
 * Selector philosophy — data-testid first.
 * Every interaction point is located by a `data-testid` documented in
 * ../TESTIDS.md, so the suite is independent of copy, styling, and component
 * internals — any front-end that renders those ids can run it unchanged. The
 * few non-testid locators left are also documented there:
 *   - `#stock-item-search-input`: DOM id on the item-search input
 *   - `role=option`:              entries in autocomplete popups
 *   - `tbody tr`:                 table rows (cells within a row carry
 *                                 `cell-<columnId>` testids)
 *
 * Out of scope here (flagged non-automatable / data-dependent in the cases, or
 * covered by other suites): master-list / location / VVM / expiring-before
 * initialisation filters (INV-03 .1-.3/.6/.7 — need specific reference data),
 * the expiry calendar widget (.21), item variants (.24), vaccine VVM dropdown
 * (.25), bulk change-location (.35), print output (.39), and the ledger-entry
 * views (SMV-01 .3-.6 — need the stock-movement ledger screen).
 *
 * NOTE: the finalisation and SMV-01 tests permanently mutate stock on the
 * connected datafile (finalising an increase writes a positive inventory
 * adjustment). They are grouped in their own describe block.
 *
 * Run:
 *   cd client
 *   BASE_URL=http://localhost:3006 yarn e2e stocktake-regression --headed --workers 1
 */
import { test, expect, Page, Locator } from '@playwright/test';

const DESCRIBE_MODE =
  (process.env['PW_MODE'] as 'default' | 'serial' | 'parallel') || 'serial';

const STOCKTAKE_ID_URL = /\/inventory\/stocktakes\/[0-9a-fA-F-]+/;

/**
 * Column-scoped cell testids (`cell-<columnId>`). Column ids come from the
 * table column definitions — the accessor key verbatim, dots included
 * (e.g. accessorKey `item.code` → `cell-item.code`).
 */
const CELL = {
  batch: 'cell-batch',
  snapshotPacks: 'cell-snapshotNumberOfPacks',
  countedPacks: 'cell-countedNumberOfPacks',
  reason: 'cell-inventoryAdjustmentReasonInput',
  itemCode: 'cell-item.code',
  packSize: 'cell-packSize',
  expiry: 'cell-expiryDate',
  manufactureDate: 'cell-manufactureDate',
  volumePerPack: 'cell-volumePerPack',
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Open the "New stocktake" modal from the list view. */
async function openCreateModal(page: Page): Promise<Locator> {
  // Avoid waitUntil:'networkidle' — the app keeps a background sync poll open so
  // the network never idles; wait on the button instead.
  await page.goto('/inventory/stocktakes', { waitUntil: 'domcontentloaded' });
  const newButton = page.getByTestId('new-stocktake-button');
  await expect(newButton).toBeVisible({ timeout: 25000 });
  await newButton.click();
  const modal = page.getByTestId('create-stocktake-modal');
  await expect(modal).toBeVisible();
  return modal;
}

/**
 * Create a stocktake and land on its detail view.
 *  - 'blank': no pre-loaded lines
 *  - 'full':  the default (Full → Items with stock on hand) — loads all stocked
 *             items, so only use where you actually want lines.
 * Returns the detail-view URL.
 */
async function createStocktake(
  page: Page,
  kind: 'blank' | 'full'
): Promise<string> {
  const modal = await openCreateModal(page);
  if (kind === 'blank') {
    await modal.getByTestId('stocktake-type-blank').click();
  }
  await modal.getByTestId('dialog-button-ok').click();
  await page.waitForURL(STOCKTAKE_ID_URL, { timeout: 30000 });
  // Widen the viewport so the responsive detail panel (which holds the Delete /
  // Copy actions) stays open — below ~1536px it auto-collapses off-screen and
  // its buttons can't be clicked. See the sibling distribution suite's
  // openSidebar note for the same effect.
  await page.setViewportSize({ width: 1600, height: 900 });
  return page.url();
}

/** The (buffered) Description input on the stocktake detail view. */
function descriptionInput(page: Page): Locator {
  return page.getByTestId('description-field');
}

/** Open the Add-item / line-edit modal on the current stocktake detail view. */
async function openAddItem(page: Page): Promise<Locator> {
  await page.getByTestId('add-item-button').click();
  const modal = page.getByTestId('add-item-modal');
  await expect(modal).toBeVisible();
  // The item search force-opens its options popup ~500ms after mount (an
  // openOnFocus popper-positioning workaround in StockItemSearchInput). Let
  // that timer fire before driving the search — otherwise a fast selection is
  // followed by a surprise popup reopen that covers the modal content and
  // swallows subsequent clicks.
  await page.waitForTimeout(600);
  return modal;
}

/** The item-search input inside the line-edit modal. */
function itemSearchInput(modal: Locator): Locator {
  return modal.locator('#stock-item-search-input');
}

/**
 * Type into the item search, pick the first matching option, and wait for the
 * batch table to render. Returns the picked item's code (from the option's
 * `item-option-code` testid).
 */
async function pickFirstItem(
  page: Page,
  modal: Locator,
  search: string
): Promise<string> {
  const combo = itemSearchInput(modal);
  // Set the term first (one-shot fill — char-by-char typing races the controlled
  // input and gets dropped), THEN click to open the popup so it renders the
  // options already filtered by the value. Clicking first and filling second
  // leaves the popup empty.
  await combo.fill(search);
  await combo.click();
  const firstOption = page.getByRole('option').first();
  await expect(firstOption).toBeVisible({ timeout: 45000 });
  const code = (
    (await firstOption.getByTestId('item-option-code').textContent()) ?? ''
  ).trim();
  await firstOption.click();
  // Options carry an interactive tooltip; after the popup closes it can linger
  // under the pointer and swallow later clicks (e.g. on the modal tabs). Park
  // the mouse in a neutral corner to dismiss it.
  await page.mouse.move(0, 0);
  // Selecting an item loads its stock lines into the Batch tab table.
  await expect(modal.getByTestId('tab-batch')).toBeVisible({ timeout: 5000 });
  await expect(modal.locator('tbody tr').first()).toBeVisible({
    timeout: 5000,
  });
  return code;
}

/** The cell at (rowIndex, cell testid) of a line-edit table. */
function cell(table: Locator, rowIndex: number, testId: string): Locator {
  return table.locator('tbody tr').nth(rowIndex).getByTestId(testId);
}

/**
 * Read the (read-only) snapshot pack count of a batch row as a normalized
 * string ("2,195.6" → "2195.6"). Snapshots can be decimal, so keep the exact
 * value for counted == snapshot comparisons.
 */
async function snapshotText(table: Locator, rowIndex: number): Promise<string> {
  return (
    (await cell(table, rowIndex, CELL.snapshotPacks).textContent()) ?? ''
  ).replace(/[,\s]/g, '');
}

/** The snapshot pack count of a batch row as a number (may be decimal). */
async function snapshotPacks(table: Locator, rowIndex: number): Promise<number> {
  return parseFloat(await snapshotText(table, rowIndex));
}

/**
 * First batch row with a non-empty batch name and a positive integer snapshot
 * — a line that can be adjusted with exact numbers and re-identified in a
 * later stocktake. Falls back to row 0.
 */
async function countableRow(
  table: Locator
): Promise<{ index: number; batch: string }> {
  const rowCount = await table.locator('tbody tr').count();
  for (let i = 0; i < rowCount; i++) {
    const batch = (
      (await cell(table, i, CELL.batch).locator('input').inputValue()) ?? ''
    ).trim();
    if (!batch) continue;
    const snap = await snapshotText(table, i);
    if (/^\d+$/.test(snap) && parseInt(snap, 10) > 0) return { index: i, batch };
  }
  return { index: 0, batch: '' };
}

/**
 * Add a blank batch line via "Add batch" and return its row index — the row
 * with an empty batch name and a 0 snapshot. A line the test owns, with no
 * backing stock line, so it can be freely edited and reduced.
 */
async function addBlankBatch(modal: Locator, table: Locator): Promise<number> {
  const before = await table.locator('tbody tr').count();
  await modal.getByTestId('add-batch-button').click();
  await expect(table.locator('tbody tr')).toHaveCount(before + 1, {
    timeout: 5000,
  });
  const rowCount = await table.locator('tbody tr').count();
  for (let i = 0; i < rowCount; i++) {
    const batch = (
      (await cell(table, i, CELL.batch).locator('input').inputValue()) ?? ''
    ).trim();
    if (batch === '' && (await snapshotText(table, i)) === '0') return i;
  }
  throw new Error('newly added blank batch row not found');
}

/**
 * The status-change (finalise) button reads its line data from the stocktake
 * query, which refetches asynchronously after the line-edit modal saves. Wait
 * for a counted value to land in the detail table before finalising —
 * otherwise the click is judged against stale "no counted lines" data and
 * shows a toast instead of the confirmation dialog.
 */
async function waitForCountedLine(page: Page): Promise<void> {
  await expect(
    page.getByTestId(CELL.countedPacks).filter({ hasNotText: '-' }).first()
  ).toBeVisible({ timeout: 15000 });
}

/** Select the first available reason for a batch row (enabled once counted ≠ snapshot). */
async function pickFirstReason(
  page: Page,
  table: Locator,
  rowIndex: number
): Promise<void> {
  await cell(table, rowIndex, CELL.reason).getByRole('combobox').click();
  const option = page.getByRole('option').first();
  await expect(option).toBeVisible({ timeout: 5000 });
  await option.click();
}

/** Confirm an "Are you sure?" dialog (delete / finalise / hold) by pressing OK. */
async function confirmAreYouSure(page: Page): Promise<void> {
  const confirm = page.getByTestId('confirmation-modal');
  await expect(confirm).toBeVisible({ timeout: 5000 });
  await confirm.getByTestId('confirmation-modal-ok').click();
  await expect(confirm).toBeHidden({ timeout: 5000 });
}

/**
 * Click the finalise (status-change) button and confirm. The button no-ops
 * with a "no lines" toast while its stocktake query is still refetching after
 * a line save, so retry once if the confirmation didn't open.
 */
async function finalise(page: Page): Promise<void> {
  const confirm = page.getByTestId('confirmation-modal');
  await page.getByTestId('status-change-button-main').click();
  if (!(await confirm.isVisible({ timeout: 3000 }).catch(() => false))) {
    await page.getByTestId('status-change-button-main').click();
  }
  await confirmAreYouSure(page);
}

/** Delete the stocktake currently open in the detail view (side panel action). */
async function deleteCurrentStocktake(page: Page): Promise<void> {
  await page.getByTestId('delete-stocktake-button').click();
  await confirmAreYouSure(page);
  await page.waitForURL(/\/inventory\/stocktakes(\?|$)/, { timeout: 10000 });
}

// ─── INV-03: list & creation ─────────────────────────────────────────────────

test.describe('Inventory: Stocktakes — creation & list', () => {
  test.describe.configure({ mode: DESCRIBE_MODE });

  test(
    'list view renders core controls',
    // No `covers` — the case has no behaviour for the list view itself; this
    // is the entry-point smoke test the detail behaviours depend on.
    async ({ page }) => {
      // Entry point for the whole case: the list must offer creation + the
      // standard table controls before any of the detail behaviours apply.
      await page.goto('/inventory/stocktakes', {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByTestId('new-stocktake-button')).toBeVisible({
        timeout: 25000,
      });
      await expect(page.getByTestId('header-status').first()).toBeVisible();
      await expect(page.getByTestId('table-pagination')).toBeVisible();
    }
  );

  test(
    'create modal offers full / filtered / blank with sub-options',
    // No `covers` — this only asserts the initialisation options exist. The
    // behaviours (.4 items-with-stock loads lines, .5 all-items includes
    // zero-stock items) are about what each mode LOADS; .4 is covered by the
    // "Full ... loads lines" test below, .5 has no deterministic test yet.
    async ({ page }) => {
      const modal = await openCreateModal(page);

      // Three initialisation modes.
      await expect(modal.getByTestId('stocktake-type-full')).toBeVisible();
      await expect(modal.getByTestId('stocktake-type-filtered')).toBeVisible();
      await expect(modal.getByTestId('stocktake-type-blank')).toBeVisible();

      // Full mode (the default) exposes the "with stock on hand" vs "all
      // items" choice and an estimated-line count.
      await expect(
        modal.getByTestId('stocktake-items-with-soh')
      ).toBeVisible();
      await expect(modal.getByTestId('stocktake-all-items')).toBeVisible();
      await expect(modal.getByTestId('stocktake-line-estimate')).toBeVisible();

      // Switching to Blank swaps the estimate for the blank-stocktake notice.
      await modal.getByTestId('stocktake-type-blank').click();
      await expect(modal.getByTestId('blank-stocktake-notice')).toBeVisible();

      // Cancel — don't create anything from this smoke test.
      await modal.getByTestId('dialog-button-cancel').click();
      await expect(modal).toBeHidden();
    }
  );

  test(
    'Blank stocktake opens with no pre-loaded lines',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.8' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      await expect(page.getByTestId('nothing-here')).toBeVisible({
        timeout: 10000,
      });
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'Full "items with stock on hand" stocktake loads lines',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.4' } },
    async ({ page }) => {
      await createStocktake(page, 'full');
      // At least one stock line loaded (a store with stock always has some).
      await expect(page.locator('tbody tr').first()).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByTestId('nothing-here')).toHaveCount(0);
      await deleteCurrentStocktake(page);
    }
  );

  test(
    '"All items" initialisation includes out-of-stock items in the line estimate',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.5' } },
    async ({ page }) => {
      // Observed via the initialisation estimate: switching Full mode from
      // "items with stock on hand" to "all items" must raise the estimated
      // line count by the store's out-of-stock items. (Actually creating an
      // all-items stocktake can mean thousands of lines — too slow to load
      // here; the estimate is the same query the creation uses.)
      const modal = await openCreateModal(page);
      const estimate = async () =>
        parseInt(
          ((
            (await modal
              .getByTestId('stocktake-line-estimate')
              .textContent()) ?? ''
          )
            .replace(/[,\s]/g, '')
            .match(/\d+/) ?? ['-1'])[0],
          10
        );

      // Wait for the with-stock estimate to load (nonzero on a stocked store).
      await expect(async () => {
        expect(await estimate()).toBeGreaterThan(0);
      }).toPass({ timeout: 15000 });
      const withStock = await estimate();

      await modal.getByTestId('stocktake-all-items').click();
      await expect(async () => {
        expect(await estimate()).toBeGreaterThan(withStock);
      }).toPass({ timeout: 15000 });

      await modal.getByTestId('dialog-button-cancel').click();
      await expect(modal).toBeHidden();
    }
  );

  test(
    'new stocktake defaults its description to "Created by <user> on <date>"',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.9' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      // Generated in the active locale (English session here).
      await expect(descriptionInput(page)).toHaveValue(/Created by .+ on .+/i);
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'description edits persist across reload',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.10' } },
    async ({ page }) => {
      const url = await createStocktake(page, 'blank');
      const value = `edited-desc-${Date.now()}`;
      const field = descriptionInput(page);
      // Wait for the persisting mutation (buffered/debounced) to actually carry
      // the new value before reloading, rather than racing a fixed timeout.
      const saved = page.waitForResponse(
        resp =>
          resp.url().includes('/graphql') &&
          (resp.request().postData() ?? '').includes(value),
        { timeout: 8000 }
      );
      await field.fill(value);
      await field.blur();
      await saved;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await expect(descriptionInput(page)).toHaveValue(value, {
        timeout: 10000,
      });
      await deleteCurrentStocktake(page);
    }
  );
});

// ─── INV-03: add item & line editing ─────────────────────────────────────────

test.describe('Inventory: Stocktakes — add item & line editing', () => {
  test.describe.configure({ mode: DESCRIBE_MODE });
  // The item catalogue is large; the first stock-item search on a cold browser
  // can take several seconds to fetch + render, so give these tests headroom.
  test.beforeEach(() => test.slow());

  test(
    'Add item: search by name filters the options',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.11' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      const combo = itemSearchInput(modal);
      await combo.fill('amox');
      await combo.click();
      await expect(async () => {
        const options = page.getByRole('option');
        const count = await options.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
          expect(
            ((await options.nth(i).textContent()) ?? '').toLowerCase()
          ).toContain('amox');
        }
      }).toPass({ timeout: 45000 });
      await modal.getByTestId('dialog-button-cancel').click();
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'Add item: search by item code filters the options',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.12' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      const combo = itemSearchInput(modal);

      // Open the popup, then grab the first option's item code from its
      // `item-option-code` testid (options render code and name in separate
      // marked nodes, so this works regardless of the datafile's code format).
      await combo.fill('amox');
      await combo.click();
      const firstOption = page.getByRole('option').first();
      await expect(firstOption).toBeVisible({ timeout: 45000 });
      const code = (
        (await firstOption.getByTestId('item-option-code').textContent()) ?? ''
      ).trim();
      expect(code).toBeTruthy();

      // Narrow to the code using the same reliable fill-then-click recipe.
      await combo.fill(code!);
      await combo.click();
      await expect(async () => {
        const options = page.getByRole('option');
        const count = await options.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
          expect((await options.nth(i).textContent()) ?? '').toContain(code!);
        }
      }).toPass({ timeout: 45000 });
      await modal.getByTestId('dialog-button-cancel').click();
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'line-edit modal exposes Batch, Pricing and Other tabs',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-03.22' },
        { type: 'covers', description: 'OMS-REG-INV-03.23' },
      ],
    },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');

      await expect(modal.getByTestId('tab-batch')).toBeVisible();
      await expect(modal.getByTestId('tab-pricing')).toBeVisible();
      await expect(modal.getByTestId('tab-other')).toBeVisible();

      // Pricing tab exposes editable pack sell/cost price columns.
      await modal.getByTestId('tab-pricing').click();
      await expect(
        modal.getByTestId('header-sellPricePerPack')
      ).toBeVisible();
      await expect(
        modal.getByTestId('header-costPricePerPack')
      ).toBeVisible();

      // Other tab exposes location / manufacturer columns.
      await modal.getByTestId('tab-other').click();
      await expect(modal.getByTestId('header-location')).toBeVisible();
      await expect(modal.getByTestId('header-manufacturer')).toBeVisible();

      await modal.getByTestId('dialog-button-cancel').click();
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'snapshot is read-only; counted ≠ snapshot requires a reason to save',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-03.20' },
        { type: 'covers', description: 'OMS-REG-INV-03.27' },
      ],
    },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');

      // Snapshot cell has no input — it's rendered read-only.
      const snapCell = cell(table, 0, CELL.snapshotPacks);
      await expect(snapCell.locator('input')).toHaveCount(0);
      const snapshot = await snapshotPacks(table, 0);
      expect(snapshot).toBeGreaterThan(0);

      // Enter a counted value different from the snapshot.
      const countedCell = cell(table, 0, CELL.countedPacks);
      await countedCell.locator('input').fill(String(snapshot + 1));

      // Saving without a reason is blocked with the reason-required error.
      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeVisible();
      await expect(
        modal.getByTestId('stocktake-line-error').first()
      ).toBeVisible({ timeout: 5000 });
      await expect(
        modal.getByTestId('stocktake-line-error').first()
      ).toContainText(/reason/i);

      await modal.getByTestId('dialog-button-cancel').click();
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'Add batch adds a blank batch line to the item',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.26' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');

      const before = await table.locator('tbody tr').count();
      await modal.getByTestId('add-batch-button').click();
      await expect(table.locator('tbody tr')).toHaveCount(before + 1, {
        timeout: 5000,
      });

      await modal.getByTestId('dialog-button-cancel').click();
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'Cancel closes the line-edit modal without saving',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.32' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      await modal.getByTestId('dialog-button-cancel').click();
      await expect(modal).toBeHidden();
      // Nothing saved — still the empty state.
      await expect(page.getByTestId('nothing-here')).toBeVisible({
        timeout: 5000,
      });
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'Ok saves the line and returns to the stocktake; the item appears in the list',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-03.13' },
        { type: 'covers', description: 'OMS-REG-INV-03.30' },
      ],
    },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      // Leave counted empty (uncounted line) so no reason is needed and no stock
      // is mutated on save.
      const code = await pickFirstItem(page, modal, 'amox');
      expect(code).toBeTruthy();

      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      // The saved line shows up in the detail table (matched by item code).
      await expect(page.getByTestId('nothing-here')).toHaveCount(0);
      await expect(
        page.getByTestId(CELL.itemCode).filter({ hasText: code }).first()
      ).toBeVisible({ timeout: 5000 });

      await deleteCurrentStocktake(page);
    }
  );

  test(
    '"OK & Next" saves the line and presents a blank form for the next item',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.31' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');

      await modal.getByTestId('dialog-button-next-and-ok').click();

      // The modal stays open with a cleared item search, ready for the next
      // item.
      await expect(modal).toBeVisible();
      await expect(itemSearchInput(modal)).toHaveValue('', { timeout: 10000 });

      // The reset re-arms the search's delayed popup auto-open (same effect
      // as openAddItem) — let it fire and dismiss it so Cancel is clickable.
      await page.waitForTimeout(700);
      const options = page.getByRole('option');
      if (await options.first().isVisible().catch(() => false)) {
        await itemSearchInput(modal).press('Escape');
        await expect(options.first()).toBeHidden({ timeout: 3000 });
      }
      await modal.getByTestId('dialog-button-cancel').click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      // The first item's line was saved before the form reset.
      await expect(page.getByTestId('nothing-here')).toHaveCount(0);
      await expect(page.locator('tbody tr').first()).toBeVisible({
        timeout: 10000,
      });
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'line fields accept input: pack size, expiry, manufacture date, volume per pack',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-03.15' },
        { type: 'covers', description: 'OMS-REG-INV-03.17' },
        { type: 'covers', description: 'OMS-REG-INV-03.18' },
        { type: 'covers', description: 'OMS-REG-INV-03.19' },
      ],
    },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');

      // Pack size is only editable on lines without a backing stock line, so
      // exercise the fields on a batch the test adds (named, so the saved
      // row can be re-identified in the detail table).
      const row = await addBlankBatch(modal, table);
      const uniq = `pw-fields-${Date.now()}`;
      await cell(table, row, CELL.batch).locator('input').fill(uniq);

      const packSize = cell(table, row, CELL.packSize).locator('input');
      await packSize.fill('5');
      await expect(packSize).toHaveValue('5');

      const volume = cell(table, row, CELL.volumePerPack).locator('input');
      await volume.fill('2');
      await expect(volume).toHaveValue('2');

      // Date fields are sectioned (the real <input> is hidden; the visible
      // sections are role=spinbutton spans). Auto-advance between sections
      // races fast typing (digits get dropped mid-move), so click each
      // section and type into it directly.
      const typeSection = async (
        dateCell: Locator,
        section: string,
        digits: string
      ) => {
        await dateCell.getByRole('spinbutton', { name: section }).click();
        await page.keyboard.type(digits, { delay: 100 });
      };
      const expiryCell = cell(table, row, CELL.expiry);
      await typeSection(expiryCell, 'Month', '12');
      await typeSection(expiryCell, 'Year', '2030');
      await expect(
        expiryCell.getByRole('spinbutton', { name: 'Year' })
      ).toHaveText('2030');

      const manufactureCell = cell(table, row, CELL.manufactureDate);
      await typeSection(manufactureCell, 'Day', '01');
      await typeSection(manufactureCell, 'Month', '01');
      await typeSection(manufactureCell, 'Year', '2024');
      await expect(
        manufactureCell.getByRole('spinbutton', { name: 'Year' })
      ).toHaveText('2024');

      // Save; the pack size lands in the detail line list on the named row.
      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });
      const savedRow = page.locator('tbody tr').filter({ hasText: uniq });
      await expect(savedRow).toBeVisible({ timeout: 10000 });
      await expect(savedRow.getByTestId(CELL.packSize)).toHaveText(/^5$/);

      await deleteCurrentStocktake(page);
    }
  );

  test(
    'reason options follow the direction of the count adjustment',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.29' } },
    async ({ page }) => {
      // An increase offers positive-adjustment reasons; a decrease offers
      // negative ones — the dropdown options update with the counted value.
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');
      const { index } = await countableRow(table);
      const snapshot = await snapshotPacks(table, index);
      const counted = cell(table, index, CELL.countedPacks).locator('input');

      const readReasons = async () => {
        await cell(table, index, CELL.reason).getByRole('combobox').click();
        const options = page.getByRole('option');
        await expect(options.first()).toBeVisible({ timeout: 5000 });
        const texts = (await options.allTextContents())
          .map(o => o.trim())
          .sort();
        // Close the popup without selecting (clickaway onto the counted cell).
        await counted.click();
        await expect(options.first()).toBeHidden({ timeout: 3000 });
        return texts;
      };

      await counted.fill(String(snapshot + 1));
      const increaseReasons = await readReasons();

      await counted.fill(String(snapshot - 1));
      const decreaseReasons = await readReasons();

      expect(increaseReasons.length).toBeGreaterThan(0);
      expect(decreaseReasons.length).toBeGreaterThan(0);
      expect(increaseReasons).not.toEqual(decreaseReasons);

      await modal.getByTestId('dialog-button-cancel').click();
      await deleteCurrentStocktake(page);
    }
  );
});

// ─── INV-03: line/bulk management, log, delete ───────────────────────────────

test.describe('Inventory: Stocktakes — line management & log', () => {
  test.describe.configure({ mode: DESCRIBE_MODE });
  // Item search hits the (slow, cold-start) central catalogue — give headroom.
  test.beforeEach(() => test.slow());

  test(
    'Log tab loads without error',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.40' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      await page.getByTestId('tab-log').click();
      await expect(page.getByTestId('tab-log')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'delete selected line removes it; the empty state returns',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.33' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      // Select ALL lines (the item can have several batches) via the header
      // select-all checkbox, then delete via the bulk-action footer.
      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByTestId('select-all-rows-checkbox').click();
      await expect(page.getByTestId('selected-rows-count')).toBeVisible({
        timeout: 3000,
      });

      await page.getByTestId('delete-lines-button').click();
      await confirmAreYouSure(page);

      await expect(page.getByTestId('nothing-here')).toBeVisible({
        timeout: 5000,
      });
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'cancelling line delete keeps the lines',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.34' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      await expect(page.locator('tbody tr').first()).toBeVisible();
      const rows = await page.locator('tbody tr').count();
      await page.getByTestId('select-all-rows-checkbox').click();
      await expect(page.getByTestId('selected-rows-count')).toBeVisible({
        timeout: 3000,
      });
      await page.getByTestId('delete-lines-button').click();

      const confirm = page.getByTestId('confirmation-modal');
      await expect(confirm).toBeVisible({ timeout: 5000 });
      await confirm.getByTestId('dialog-button-cancel').click();
      await expect(confirm).toBeHidden({ timeout: 5000 });

      await expect(page.locator('tbody tr')).toHaveCount(rows);
      await deleteCurrentStocktake(page);
    }
  );

  test(
    '"Order by" reorders the line list by the selected column',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.38' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });
      await expect(page.locator('tbody tr').first()).toBeVisible();

      // Clicking a header opens its column menu; sort from there.
      await page.getByTestId('header-batch').click();
      await page
        .getByRole('menuitem', { name: /sort by .* ascending/i })
        .click();

      // Don't assume the app's collation (it sorts uppercase before
      // lowercase); accept any consistent ascending ordering.
      const isSorted = (arr: string[], cmp: (a: string, b: string) => number) =>
        arr.every((v, i) => i === 0 || cmp(arr[i - 1] ?? '', v) <= 0);
      await expect(async () => {
        const batches = (await page.getByTestId(CELL.batch).allTextContents())
          .map(b => b.trim())
          .filter(Boolean);
        expect(batches.length).toBeGreaterThan(1);
        expect(
          isSorted(batches, (a, b) => (a < b ? -1 : a > b ? 1 : 0)) ||
            isSorted(batches, (a, b) =>
              a.localeCompare(b, 'en', { sensitivity: 'base' })
            )
        ).toBe(true);
      }).toPass({ timeout: 10000 });

      await deleteCurrentStocktake(page);
    }
  );

  test(
    'comment edits persist across reload',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.37' } },
    async ({ page }) => {
      const url = await createStocktake(page, 'blank');
      const value = `pw-comment-${Date.now()}`;
      // The comment lives in the detail side panel (open at this viewport).
      const field = page.getByTestId('comment-field');
      await expect(field).toBeVisible({ timeout: 10000 });
      const saved = page.waitForResponse(
        resp =>
          resp.url().includes('/graphql') &&
          (resp.request().postData() ?? '').includes(value),
        { timeout: 8000 }
      );
      await field.fill(value);
      await field.blur();
      await saved;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('comment-field')).toHaveValue(value, {
        timeout: 10000,
      });
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'bulk "Reduce to 0" sets counted packs to 0 on the selected line',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-03.36' },
        // .14: the new batch line's Batch field accepts input — the typed name
        // is saved and used to re-identify the row in the detail table.
        { type: 'covers', description: 'OMS-REG-INV-03.14' },
      ],
    },
    async ({ page }) => {
      // Reduce a batch the test creates itself: reducing existing stock-backed
      // lines to 0 is rejected server-side (whole batch, silently) when any of
      // their stock is reserved (StockLineReducedBelowZero), which is
      // datafile-dependent. A fresh batch has no stock line, so reducing it is
      // always legal.
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');

      // Name the new batch so we can re-identify its row in the detail table.
      const uniq = `pw-reduce-${Date.now()}`;
      const newRow = await addBlankBatch(modal, table);
      await cell(table, newRow, CELL.batch).locator('input').fill(uniq);

      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      // Select just that row and reduce it.
      const row = page.locator('tbody tr').filter({ hasText: uniq });
      await expect(row).toBeVisible({ timeout: 10000 });
      await row.getByTestId('select-row-checkbox').click();
      await expect(page.getByTestId('selected-rows-count')).toBeVisible({
        timeout: 3000,
      });

      await page.getByTestId('reduce-lines-to-zero-button').click();

      // "Reduce to 0" opens an "Are you sure?" modal that requires a reason
      // when the store has inventory-adjustment reasons configured (the reason
      // options load asynchronously — give them time to appear). Its OK is a
      // standard dialog button (not the confirmation-modal-ok variant).
      const reduceModal = page.getByTestId('confirmation-modal');
      await expect(reduceModal).toBeVisible({ timeout: 5000 });
      const reasonCombo = reduceModal.getByRole('combobox').first();
      if (await reasonCombo.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reasonCombo.click();
        const opt = page.getByRole('option').first();
        await expect(opt).toBeVisible({ timeout: 5000 });
        await opt.click();
      }
      await reduceModal.getByTestId('dialog-button-ok').click();
      await expect(reduceModal).toBeHidden({ timeout: 5000 });

      // The reduced row's "Packs counted" cell should now read 0.
      await expect(row.getByTestId(CELL.countedPacks)).toHaveText(/^0$/, {
        timeout: 10000,
      });

      await deleteCurrentStocktake(page);
    }
  );

  test(
    'delete stocktake: cancel preserves it, confirm removes it',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-03.41' },
        { type: 'covers', description: 'OMS-REG-INV-03.42' },
      ],
    },
    async ({ page }) => {
      await createStocktake(page, 'blank');

      // Cancel the delete — stocktake stays.
      await page.getByTestId('delete-stocktake-button').click();
      const confirm = page.getByTestId('confirmation-modal');
      await expect(confirm).toBeVisible();
      await confirm.getByTestId('dialog-button-cancel').click();
      await expect(confirm).toBeHidden();
      await expect(page).toHaveURL(STOCKTAKE_ID_URL);

      // Confirm the delete — back to the list.
      await deleteCurrentStocktake(page);
      expect(page.url()).not.toMatch(STOCKTAKE_ID_URL);
    }
  );
});

// ─── INV-04 & SMV-01: finalisation, edit protection, ledger (MUTATING) ───────

test.describe('Inventory: Stocktakes — finalisation & stock effects', () => {
  test.describe.configure({ mode: DESCRIBE_MODE });
  // Item search hits the (slow, cold-start) central catalogue — give headroom.
  test.beforeEach(() => test.slow());

  test(
    'finalising with a valid reason sets the status to Finalised',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-04.2' },
        { type: 'covers', description: 'OMS-REG-INV-04.3' },
        // .16: the Counted packs field accepts input (typed value is saved and
        // visible in the detail table before finalising).
        { type: 'covers', description: 'OMS-REG-INV-03.16' },
        // .28: the reason dropdown offers the configured reason codes (an
        // option list appears and a configured reason is selectable).
        { type: 'covers', description: 'OMS-REG-INV-03.28' },
      ],
    },
    async ({ page }) => {
      // Mutates stock: finalises a +1 pack increase with a positive-adjustment
      // reason.
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');

      const { index } = await countableRow(table);
      const snapshot = await snapshotPacks(table, index);
      const countedCell = cell(table, index, CELL.countedPacks);
      await countedCell.locator('input').fill(String(snapshot + 1));
      await pickFirstReason(page, table, index);

      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });
      await waitForCountedLine(page);

      await finalise(page);

      // The footer no longer offers the status-change button and the
      // finalised notice appears.
      await expect(page.getByTestId('stocktake-status-alert')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByTestId('stocktake-status-alert')).toContainText(
        /finalised/i
      );
      await expect(
        page.getByTestId('status-change-button-main')
      ).toHaveCount(0);
      // Finalised stocktakes cannot be deleted — leave it in place.
    }
  );

  test(
    'a finalised stocktake is read-only',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-04.4' },
        { type: 'covers', description: 'OMS-REG-INV-04.5' },
        { type: 'covers', description: 'OMS-REG-INV-04.6' },
        { type: 'covers', description: 'OMS-REG-INV-04.7' },
        { type: 'covers', description: 'OMS-REG-INV-04.8' },
        { type: 'covers', description: 'OMS-REG-INV-04.9' },
        { type: 'covers', description: 'OMS-REG-INV-04.10' },
      ],
    },
    async ({ page }) => {
      // Build a finalised stocktake (counted = snapshot → no stock change, so a
      // reason isn't required and nothing is mutated) then assert lock-down.
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');
      // Fill the exact displayed snapshot (may be decimal) so there's no
      // difference and no reason is required.
      const snapshot = await snapshotText(table, 0);
      const countedCell = cell(table, 0, CELL.countedPacks);
      await countedCell.locator('input').fill(snapshot); // no difference
      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });
      await waitForCountedLine(page);

      await finalise(page);
      await expect(page.getByTestId('stocktake-status-alert')).toContainText(
        /finalised/i,
        { timeout: 10000 }
      );

      // Description is read-only and Add item is present but disabled.
      await expect(descriptionInput(page)).toBeDisabled();
      await expect(page.getByTestId('add-item-button')).toBeDisabled();

      // Line fields are read-only too: open the first line's edit modal and
      // check batch / pack size / counted / expiry are all disabled.
      await page.locator('tbody tr').first().click();
      const editModal = page.getByTestId('add-item-modal');
      await expect(editModal).toBeVisible({ timeout: 10000 });
      const editTable = editModal.locator('table');
      await expect(editTable.locator('tbody tr').first()).toBeVisible({
        timeout: 10000,
      });
      await expect(
        cell(editTable, 0, CELL.batch).locator('input')
      ).toBeDisabled();
      await expect(
        cell(editTable, 0, CELL.packSize).locator('input')
      ).toBeDisabled();
      await expect(
        cell(editTable, 0, CELL.countedPacks).locator('input')
      ).toBeDisabled();
      await expect(
        cell(editTable, 0, CELL.expiry).locator('input')
      ).toBeDisabled();
      await editModal.getByTestId('dialog-button-cancel').click();
      await expect(editModal).toBeHidden({ timeout: 5000 });

      // Deleting lines is blocked: the attempt is refused (no confirmation
      // dialog) and the rows stay.
      const rowCount = await page.locator('tbody tr').count();
      await page.getByTestId('select-all-rows-checkbox').click();
      await expect(page.getByTestId('selected-rows-count')).toBeVisible({
        timeout: 3000,
      });
      await page.getByTestId('delete-lines-button').click();
      await expect(page.getByTestId('confirmation-modal')).toHaveCount(0);
      await expect(page.locator('tbody tr')).toHaveCount(rowCount);
    }
  );

  test(
    'placing a stocktake on hold makes it read-only',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-04.11' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');

      await page.getByTestId('on-hold-button').click();
      // Some builds confirm the hold — accept if a dialog appears.
      const confirm = page.getByTestId('confirmation-modal');
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.getByTestId('confirmation-modal-ok').click();
      }

      await expect(page.getByTestId('stocktake-status-alert')).toContainText(
        /on hold/i,
        { timeout: 5000 }
      );
      await expect(descriptionInput(page)).toBeDisabled();

      // Take it back off hold so the stocktake can be deleted for cleanup.
      await page.getByTestId('on-hold-button').click();
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.getByTestId('confirmation-modal-ok').click();
      }
      await expect(descriptionInput(page)).toBeEnabled({ timeout: 5000 });
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'finalising an increase raises the batch quantity on the same stock line',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-SMV-01.1' },
        { type: 'covers', description: 'OMS-REG-SMV-01.2' },
      ],
    },
    async ({ page }) => {
      // The stocktake snapshot for a batch equals its current stock-on-hand, so
      // finalising a +N increase and then re-reading the snapshot in a fresh
      // stocktake proves the quantity rose by N on the *same* batch (no new
      // line). Ledger-entry sign/linkage (SMV-01 .3-.6) needs the stock-movement
      // ledger view and is out of scope here.
      const INCREASE = 3;

      // 1) Baseline: a named, integer-snapshot batch of our item (exact
      // arithmetic + re-identifiable in the follow-up stocktake).
      await createStocktake(page, 'blank');
      let modal = await openAddItem(page);
      const pickedCode = await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');
      const { index, batch } = await countableRow(table);
      expect(batch, 'a named batch with an integer snapshot').toBeTruthy();
      const baseline = await snapshotPacks(table, index);

      // 2) Finalise a +INCREASE adjustment on that batch.
      const countedCell = cell(table, index, CELL.countedPacks);
      await countedCell.locator('input').fill(String(baseline + INCREASE));
      await pickFirstReason(page, table, index);
      await modal.getByTestId('dialog-button-ok').click();
      await expect(modal).toBeHidden({ timeout: 5000 });
      await waitForCountedLine(page);
      await finalise(page);
      await expect(page.getByTestId('stocktake-status-alert')).toContainText(
        /finalised/i,
        { timeout: 10000 }
      );

      // 3) Re-read: a new blank stocktake with the same item should show the
      // batch's snapshot raised by INCREASE (same batch number, not a new line).
      await createStocktake(page, 'blank');
      modal = await openAddItem(page);
      await pickFirstItem(page, modal, pickedCode || 'amox');
      const table2 = modal.locator('table');

      // Find the row with the same batch number and assert its snapshot rose.
      const rows = table2.locator('tbody tr');
      const rowCount = await rows.count();
      let matched = -1;
      for (let i = 0; i < rowCount; i++) {
        const b = (
          (await cell(table2, i, CELL.batch).locator('input').inputValue()) ??
          ''
        ).trim();
        if (b === batch) {
          matched = i;
          break;
        }
      }
      expect(
        matched,
        `batch ${batch} still present as one line`
      ).toBeGreaterThanOrEqual(0);
      expect(await snapshotPacks(table2, matched)).toBe(baseline + INCREASE);

      await modal.getByTestId('dialog-button-cancel').click();
      await deleteCurrentStocktake(page);
    }
  );
});
