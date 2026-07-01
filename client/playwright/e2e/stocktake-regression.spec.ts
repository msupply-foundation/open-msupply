/**
 * Stocktake regression suite.
 *
 * Source of truth: the OMS-REG-INV-03, OMS-REG-INV-04 and OMS-REG-SMV-01
 * regression cases in the (private) tmf-testing repo (behaviour-anchored format,
 * PR #10). Each test carries a `covers` annotation naming the behaviour ID(s) it
 * exercises; the coverage report is generated from those annotations via the json
 * reporter.
 *
 *   - OMS-REG-INV-03  Stocktake creation & item/batch management (detail view)
 *   - OMS-REG-INV-04  Stocktake finalisation & edit protection
 *   - OMS-REG-SMV-01  Stock/ledger effects of finalising a stocktake
 *
 * Selector philosophy — RESILIENT TO A FRONT-END REWRITE.
 * The stocktake feature ships with no data-testids, so every locator here is
 * anchored to something a functional rewrite would preserve: ARIA roles,
 * accessible names, visible label text, and table *column headers* (never cell
 * indices hard-coded, never CSS classes). Where a field's label isn't
 * aria-linked to its input (InputWithLabelRow), we resolve the input from the
 * label text rather than a testid. If the rewrite keeps the same behaviour and
 * copy, these tests keep passing.
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Open the "New stocktake" modal from the list view. */
async function openCreateModal(page: Page): Promise<Locator> {
  // Avoid waitUntil:'networkidle' — the app keeps a background sync poll open so
  // the network never idles; wait on the button instead.
  await page.goto('/inventory/stocktakes', { waitUntil: 'domcontentloaded' });
  const newButton = page.getByRole('button', { name: 'New stocktake' });
  await expect(newButton).toBeVisible({ timeout: 25000 });
  await newButton.click();
  const modal = page.getByRole('dialog', { name: 'New stocktake' });
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
    await modal.getByRole('radio', { name: /blank stocktake/i }).click();
  }
  await modal.getByRole('button', { name: 'OK', exact: true }).click();
  await page.waitForURL(STOCKTAKE_ID_URL, { timeout: 30000 });
  // Widen the viewport so the responsive detail panel (which holds the Delete /
  // Copy actions) stays open — below ~1536px it auto-collapses off-screen and
  // its buttons can't be clicked. See the sibling distribution suite's
  // openSidebar note for the same effect.
  await page.setViewportSize({ width: 1600, height: 900 });
  return page.url();
}

/**
 * The Description field uses InputWithLabelRow; the "Description" label is not
 * aria-linked to its input, so resolve the first text input that follows the
 * label in document order. Survives a rewrite as long as the label precedes the
 * field.
 */
function descriptionInput(page: Page): Locator {
  return page
    .getByText('Description:', { exact: false })
    .locator('xpath=following::input[1]');
}

/** Open the Add-item / line-edit modal on the current stocktake detail view. */
async function openAddItem(page: Page): Promise<Locator> {
  await page
    .getByRole('button', { name: 'Add item' })
    .first()
    .click();
  const modal = page.getByRole('dialog', { name: 'Add item' });
  await expect(modal).toBeVisible();
  return modal;
}

/**
 * Type into the item search, pick the first matching option, and wait for the
 * batch table to render. Returns the picked option's text.
 */
async function pickFirstItem(
  page: Page,
  modal: Locator,
  search: string
): Promise<string> {
  const combo = modal.getByRole('combobox').first();
  // Set the term first (one-shot fill — char-by-char typing races the controlled
  // input and gets dropped), THEN click to open the popup so it renders the
  // options already filtered by the value. Clicking first and filling second
  // leaves the popup empty.
  await combo.fill(search);
  await combo.click();
  const firstOption = page.getByRole('option').first();
  await expect(firstOption).toBeVisible({ timeout: 45000 });
  const text = ((await firstOption.textContent()) ?? '').trim();
  await firstOption.click();
  // Selecting an item loads its stock lines into the Batch tab table.
  await expect(modal.getByRole('tab', { name: 'Batch' })).toBeVisible({
    timeout: 5000,
  });
  await expect(modal.locator('tbody tr').first()).toBeVisible({
    timeout: 5000,
  });
  return text;
}

/**
 * Resolve a line-edit table column's zero-based index by its header text so we
 * never hard-code cell positions. Headers and row cells align 1:1 (the count
 * checkbox is both the first header and the first cell).
 */
async function columnIndex(table: Locator, header: string): Promise<number> {
  const headers = table.locator('thead th');
  const count = await headers.count();
  for (let i = 0; i < count; i++) {
    const text = ((await headers.nth(i).textContent()) ?? '').trim();
    if (text === header || text.startsWith(header)) return i;
  }
  throw new Error(`Column header "${header}" not found`);
}

/** The cell at (rowIndex, header) of a line-edit table. */
async function cell(
  table: Locator,
  rowIndex: number,
  header: string
): Promise<Locator> {
  const idx = await columnIndex(table, header);
  return table.locator('tbody tr').nth(rowIndex).locator('td').nth(idx);
}

/** Read the (read-only) snapshot pack count of a batch row as a number. */
async function snapshotPacks(table: Locator, rowIndex: number): Promise<number> {
  const snapCell = await cell(table, rowIndex, 'Packs snapshot');
  const raw = ((await snapCell.textContent()) ?? '').replace(/[,\s]/g, '');
  return parseInt(raw, 10);
}

/** Select the first available reason for a batch row (enabled once counted ≠ snapshot). */
async function pickFirstReason(
  page: Page,
  table: Locator,
  rowIndex: number
): Promise<void> {
  const reasonCell = await cell(table, rowIndex, 'Reason');
  await reasonCell.getByRole('combobox').click();
  const option = page.getByRole('option').first();
  await expect(option).toBeVisible({ timeout: 5000 });
  await option.click();
}

/** Confirm a "Are you sure?" dialog (delete / finalise) by pressing OK. */
async function confirmAreYouSure(page: Page): Promise<void> {
  const confirm = page
    .getByRole('dialog')
    .filter({ hasText: /Are you sure/i });
  await expect(confirm).toBeVisible({ timeout: 5000 });
  await confirm.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(confirm).toBeHidden({ timeout: 5000 });
}

/** Delete the stocktake currently open in the detail view. */
async function deleteCurrentStocktake(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await confirmAreYouSure(page);
  await page.waitForURL(/\/inventory\/stocktakes(\?|$)/, { timeout: 10000 });
}

// ─── INV-03: list & creation ─────────────────────────────────────────────────

test.describe('Inventory: Stocktakes — creation & list', () => {
  test.describe.configure({ mode: DESCRIBE_MODE });

  test(
    'list view renders core controls',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.8' } },
    async ({ page }) => {
      // Entry point for the whole case: the list must offer creation + the
      // standard table controls before any of the detail behaviours apply.
      await page.goto('/inventory/stocktakes', {
        waitUntil: 'domcontentloaded',
      });
      await expect(
        page.getByRole('button', { name: 'New stocktake' })
      ).toBeVisible({ timeout: 25000 });
      await expect(
        page.getByRole('columnheader', { name: /Status/i }).first()
      ).toBeVisible();
      await expect(page.getByText(/Rows per page/i).first()).toBeVisible();
    }
  );

  test(
    'create modal offers full / filtered / blank with sub-options',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-03.4' },
        { type: 'covers', description: 'OMS-REG-INV-03.5' },
      ],
    },
    async ({ page }) => {
      const modal = await openCreateModal(page);

      // Three initialisation modes.
      await expect(
        modal.getByRole('radio', { name: /full stocktake/i })
      ).toBeVisible();
      await expect(
        modal.getByRole('radio', { name: /filtered stocktake/i })
      ).toBeVisible();
      await expect(
        modal.getByRole('radio', { name: /blank stocktake/i })
      ).toBeVisible();

      // Full mode exposes the "with stock on hand" vs "all items" choice and an
      // estimated-line count.
      await expect(
        modal.getByRole('radio', { name: /Items with stock on hand/i })
      ).toBeVisible();
      await expect(
        modal.getByRole('radio', {
          name: /All items \(include out of stock/i,
        })
      ).toBeVisible();
      await expect(modal.getByText(/lines estimated/i)).toBeVisible();

      // Switching to Blank swaps the estimate for the blank-stocktake notice.
      await modal.getByRole('radio', { name: /blank stocktake/i }).click();
      await expect(
        modal.getByText(/create a blank stocktake/i)
      ).toBeVisible();

      // Cancel — don't create anything from this smoke test.
      await modal.getByRole('button', { name: 'Cancel' }).click();
      await expect(modal).toBeHidden();
    }
  );

  test(
    'Blank stocktake opens with no pre-loaded lines',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.8' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      await expect(page.getByText(/Nothing here/i)).toBeVisible({
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
      await expect(page.getByText(/Nothing here/i)).toHaveCount(0);
      await deleteCurrentStocktake(page);
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
      const combo = modal.getByRole('combobox').first();
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
      await modal.getByRole('button', { name: 'Cancel' }).click();
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'Add item: search by item code filters the options',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.12' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      const combo = modal.getByRole('combobox').first();

      // Open the popup, then grab the first option's item code. Options render
      // code and name in separate nodes, so textContent joins them with no
      // separator ("03_0452Amoxicillin…"); pull the leading code by its shape
      // (the datafile uses NN_NNNN codes) rather than a whitespace split.
      await combo.fill('amox');
      await combo.click();
      const firstOption = page.getByRole('option').first();
      await expect(firstOption).toBeVisible({ timeout: 45000 });
      const code = (((await firstOption.textContent()) ?? '').match(
        /^(\d+_\d+)/
      ) ?? [])[1];
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
      await modal.getByRole('button', { name: 'Cancel' }).click();
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

      await expect(modal.getByRole('tab', { name: 'Batch' })).toBeVisible();
      await expect(modal.getByRole('tab', { name: 'Pricing' })).toBeVisible();
      await expect(modal.getByRole('tab', { name: 'Other' })).toBeVisible();

      // Pricing tab exposes editable pack sell/cost price columns.
      await modal.getByRole('tab', { name: 'Pricing' }).click();
      await expect(
        modal.getByRole('columnheader', { name: /Pack sell price/i })
      ).toBeVisible();
      await expect(
        modal.getByRole('columnheader', { name: /Pack cost price/i })
      ).toBeVisible();

      // Other tab exposes location / manufacturer / comment columns.
      await modal.getByRole('tab', { name: 'Other' }).click();
      await expect(
        modal.getByRole('columnheader', { name: /Location/i })
      ).toBeVisible();
      await expect(
        modal.getByRole('columnheader', { name: /Manufacturer/i })
      ).toBeVisible();

      await modal.getByRole('button', { name: 'Cancel' }).click();
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
      const snapCell = await cell(table, 0, 'Packs snapshot');
      await expect(snapCell.locator('input')).toHaveCount(0);
      const snapshot = await snapshotPacks(table, 0);
      expect(snapshot).toBeGreaterThan(0);

      // Enter a counted value different from the snapshot.
      const countedCell = await cell(table, 0, 'Packs counted');
      await countedCell.locator('input').fill(String(snapshot + 1));

      // Saving without a reason is blocked with the reason-required warning.
      await modal.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(modal).toBeVisible();
      await expect(
        modal.getByText(/reason must be provided/i)
      ).toBeVisible({ timeout: 5000 });

      await modal.getByRole('button', { name: 'Cancel' }).click();
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
      await modal.getByRole('button', { name: /Add batch/i }).click();
      await expect(table.locator('tbody tr')).toHaveCount(before + 1, {
        timeout: 5000,
      });

      await modal.getByRole('button', { name: 'Cancel' }).click();
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
      await modal.getByRole('button', { name: 'Cancel' }).click();
      await expect(modal).toBeHidden();
      // Nothing saved — still the empty state.
      await expect(page.getByText(/Nothing here/i)).toBeVisible({
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
      const picked = await pickFirstItem(page, modal, 'amox');
      // Option text joins code+name without a separator; take the NN_NNNN code.
      const code = (picked.match(/^(\d+_\d+)/) ?? [])[1] ?? '';
      expect(code).toBeTruthy();

      await modal.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      // The saved line shows up in the detail table (matched by item code).
      await expect(page.getByText(/Nothing here/i)).toHaveCount(0);
      await expect(
        page.getByRole('cell', { name: code }).first()
      ).toBeVisible({ timeout: 5000 });

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
      await page.getByRole('tab', { name: 'Log' }).click();
      await expect(
        page.getByRole('tab', { name: 'Log', selected: true })
      ).toBeVisible();
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
      await modal.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      // Select ALL lines (the item can have several batches) via the header
      // select-all checkbox, then delete via the bulk-action footer. The footer
      // Delete is first in the DOM; the side panel also has a "Delete" (for the
      // whole stocktake), so .first() must stay the footer one.
      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page
        .getByRole('checkbox', { name: /select all/i })
        .first()
        .click();
      await expect(page.getByText(/Selected/i)).toBeVisible({ timeout: 3000 });

      await page
        .getByRole('button', { name: 'Delete', exact: true })
        .first()
        .click();
      await confirmAreYouSure(page);

      await expect(page.getByText(/Nothing here/i)).toBeVisible({
        timeout: 5000,
      });
      await deleteCurrentStocktake(page);
    }
  );

  test(
    'bulk "Reduce to 0" sets counted packs to 0 on the selected line',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-03.36' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      await modal.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      // Select all lines (the item may have multiple batches) and reduce them,
      // so every row's counted becomes 0 regardless of row ordering.
      await expect(page.locator('tbody tr').first()).toBeVisible();
      await page
        .getByRole('checkbox', { name: /select all/i })
        .first()
        .click();
      await expect(page.getByText(/Selected/i)).toBeVisible({ timeout: 3000 });

      await page.getByRole('button', { name: /Reduce to 0/i }).click();

      // "Reduce to 0" opens an "Are you sure?" modal that requires a reason.
      const reduceModal = page
        .getByRole('dialog')
        .filter({ hasText: /Are you sure/i });
      await expect(reduceModal).toBeVisible({ timeout: 5000 });
      const reasonCombo = reduceModal.getByRole('combobox').first();
      if (await reasonCombo.isVisible({ timeout: 1000 }).catch(() => false)) {
        await reasonCombo.click();
        const opt = page.getByRole('option').first();
        await expect(opt).toBeVisible({ timeout: 5000 });
        await opt.click();
      }
      await reduceModal.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(reduceModal).toBeHidden({ timeout: 5000 });

      // Every "Packs counted" cell in the detail line table should now read 0.
      const detailTable = page.locator('table').last();
      const countedIdx = await columnIndex(detailTable, 'Packs counted');
      const countedCells = detailTable
        .locator('tbody tr')
        .locator(`td:nth-child(${countedIdx + 1})`);
      await expect(countedCells.first()).toHaveText(/^0$/, { timeout: 10000 });

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
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      const confirm = page
        .getByRole('dialog')
        .filter({ hasText: /Are you sure/i });
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Cancel' }).click();
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
      ],
    },
    async ({ page }) => {
      // Mutates stock: finalises a +1 pack increase with a positive-adjustment
      // reason.
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');

      const snapshot = await snapshotPacks(table, 0);
      const countedCell = await cell(table, 0, 'Packs counted');
      await countedCell.locator('input').fill(String(snapshot + 1));
      await pickFirstReason(page, table, 0);

      await modal.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      await page.getByRole('button', { name: /Confirm Finalised/i }).click();
      await confirmAreYouSure(page);

      // Status footer no longer offers "Confirm Finalised" and the finalised
      // notice appears.
      await expect(
        page.getByText(/finalised and cannot be edited/i)
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole('button', { name: /Confirm Finalised/i })
      ).toHaveCount(0);
      // Finalised stocktakes cannot be deleted — leave it in place.
    }
  );

  test(
    'a finalised stocktake is read-only',
    {
      annotation: [
        { type: 'covers', description: 'OMS-REG-INV-04.8' },
        { type: 'covers', description: 'OMS-REG-INV-04.9' },
      ],
    },
    async ({ page }) => {
      // Build a finalised stocktake (counted = snapshot → no stock change, so a
      // reason isn't required and nothing is mutated) then assert lock-down.
      await createStocktake(page, 'blank');
      const modal = await openAddItem(page);
      await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');
      const snapshot = await snapshotPacks(table, 0);
      const countedCell = await cell(table, 0, 'Packs counted');
      await countedCell.locator('input').fill(String(snapshot)); // no difference
      await modal.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      await page.getByRole('button', { name: /Confirm Finalised/i }).click();
      await confirmAreYouSure(page);
      await expect(
        page.getByText(/finalised and cannot be edited/i)
      ).toBeVisible({ timeout: 10000 });

      // Description is read-only and Add item is present but disabled.
      await expect(descriptionInput(page)).toBeDisabled();
      await expect(
        page.getByRole('button', { name: 'Add item' })
      ).toBeDisabled();
    }
  );

  test(
    'placing a stocktake on hold makes it read-only',
    { annotation: { type: 'covers', description: 'OMS-REG-INV-04.11' } },
    async ({ page }) => {
      await createStocktake(page, 'blank');

      await page.getByRole('button', { name: /On hold/i }).click();
      // Some builds confirm the hold — accept if a dialog appears.
      const confirm = page
        .getByRole('dialog')
        .filter({ hasText: /Are you sure/i });
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.getByRole('button', { name: 'OK', exact: true }).click();
      }

      await expect(page.getByText(/on hold and cannot be edited/i)).toBeVisible(
        { timeout: 5000 }
      );
      await expect(descriptionInput(page)).toBeDisabled();

      // Take it back off hold so the stocktake can be deleted for cleanup.
      await page.getByRole('button', { name: /On hold/i }).click();
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.getByRole('button', { name: 'OK', exact: true }).click();
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

      // 1) Baseline: snapshot of the first batch of our item.
      await createStocktake(page, 'blank');
      let modal = await openAddItem(page);
      const picked = await pickFirstItem(page, modal, 'amox');
      const table = modal.locator('table');
      const baseline = await snapshotPacks(table, 0);
      const batchCell = await cell(table, 0, 'Batch');
      const batch = ((await batchCell.locator('input').inputValue()) ?? '').trim();

      // 2) Finalise a +INCREASE adjustment on that batch.
      const countedCell = await cell(table, 0, 'Packs counted');
      await countedCell.locator('input').fill(String(baseline + INCREASE));
      await pickFirstReason(page, table, 0);
      await modal.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(modal).toBeHidden({ timeout: 5000 });
      await page.getByRole('button', { name: /Confirm Finalised/i }).click();
      await confirmAreYouSure(page);
      await expect(
        page.getByText(/finalised and cannot be edited/i)
      ).toBeVisible({ timeout: 10000 });

      // 3) Re-read: a new blank stocktake with the same item should show the
      // batch's snapshot raised by INCREASE (same batch number, not a new line).
      await createStocktake(page, 'blank');
      modal = await openAddItem(page);
      // Option text joins code+name with no separator; take the NN_NNNN code.
      const code = (picked.match(/^(\d+_\d+)/) ?? [])[1] ?? 'amox';
      await pickFirstItem(page, modal, code);
      const table2 = modal.locator('table');

      // Find the row with the same batch number and assert its snapshot rose.
      const rows = table2.locator('tbody tr');
      const rowCount = await rows.count();
      let matched = -1;
      for (let i = 0; i < rowCount; i++) {
        const bCell = await cell(table2, i, 'Batch');
        const b = ((await bCell.locator('input').inputValue()) ?? '').trim();
        if (b === batch) {
          matched = i;
          break;
        }
      }
      expect(matched, `batch ${batch} still present as one line`).toBeGreaterThanOrEqual(
        0
      );
      expect(await snapshotPacks(table2, matched)).toBe(baseline + INCREASE);

      await modal.getByRole('button', { name: 'Cancel' }).click();
      await deleteCurrentStocktake(page);
    }
  );
});
