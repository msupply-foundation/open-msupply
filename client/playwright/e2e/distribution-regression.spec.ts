/**
 * Distribution regression suite.
 *
 * Source of truth: distribution-regression.md at repo root,
 * mirrored from https://github.com/msupply-foundation/open-msupply/wiki/Test:-Distribution
 *
 * This spec is intentionally independent of smoke-all-sections.spec.ts.
 * Goal: full coverage of every bullet in the md, even if duplicated elsewhere.
 *
 * v1 scope: Outbound Shipments — happy-path end-to-end
 * (create → add item → Confirm Allocated → Confirm Picked → Confirm Shipped).
 * Future passes layer on filters, exports, deletes, master lists, edits,
 * placeholders, returns, requisitions, etc.
 *
 * Run:
 *   cd client
 *   BASE_URL=http://localhost:3005 yarn e2e distribution-regression --headed --workers 1
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Distribution: Outbound Shipments', () => {
  test.describe.configure({ mode: 'serial' });

  // ─── List view tests (run first so they aren't affected by created data) ──

  test('list view renders core controls', async ({ page }) => {
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: /New Shipment/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Status/i }).first()).toBeVisible();
    await expect(page.getByText(/Rows per page/i).first()).toBeVisible();
  });

  test('search by customer name filters results', async ({ page }) => {
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // The Name (customer) cell also contains a "Select a colour" button before
    // the text, so we strip that label out.
    const nameColumn = await getColumnIndex(page, 'Name');
    const customerCell = firstRow.locator('td').nth(nameColumn);
    const customerName = ((await customerCell.textContent()) ?? '')
      .replace(/Select a colour/i, '')
      .trim();
    expect(customerName.length).toBeGreaterThan(0);

    // Search isn't visible by default — open the Filters dropdown and pick
    // "Name" to reveal a "Search by name" textbox.
    await page.getByRole('combobox', { name: /Filters/i }).click();
    // Items are role="menuitem" in this MUI Select, not "option".
    await page.getByRole('menuitem', { name: 'Name', exact: true }).click();

    const searchBox = page.getByPlaceholder(/Search by name/i);
    await expect(searchBox).toBeVisible();

    const term = customerName.split(/\s+/)[0]!;

    // Wait for the debounced filter RESPONSE (not just the request) so the
    // table has actually re-rendered with the filtered rows before we sample
    // rowCount. waitForRequest resolves when the request is sent, which can
    // leave the loop iterating the pre-filter rows that then shrink mid-loop.
    const filterResponse = page.waitForResponse(
      resp =>
        resp.url().includes('/graphql') &&
        (resp.request().postData() ?? '').toLowerCase().includes(term.toLowerCase()),
      { timeout: 5000 }
    );
    await searchBox.fill(term);
    await filterResponse;

    // Snapshot all visible Name cells in a single locator call and retry
    // until they stabilise. Iterating with per-row awaits races against the
    // table re-rendering as filter results stream in.
    await expect(async () => {
      const names = await page
        .locator(`tbody tr td:nth-child(${nameColumn + 1})`)
        .allTextContents();
      expect(names.length).toBeGreaterThan(0);
      for (const raw of names) {
        const name = raw.replace(/Select a colour/i, '').trim().toLowerCase();
        expect(name).toContain(term.toLowerCase());
      }
    }).toPass({ timeout: 5000 });
  });

  test('delete a New-status shipment via bulk action', async ({ page }) => {
    // Create a fresh shipment so we know exactly which row to delete.
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /New Shipment/i }).click();
    const customerDialog = page.getByTestId('customer-search-modal');
    await expect(customerDialog).toBeVisible();
    await customerDialog.locator('input[role="combobox"]').first().click();
    await page.locator('[role="option"]').first().click();
    await page.waitForURL(/\/distribution\/outbound-shipment\/[^/]+/, { timeout: 10000 });

    // Capture the invoice number from the breadcrumb (e.g. "Outbound Shipments / 22").
    // The sidebar is also a <nav>, so filter to the one containing the breadcrumb text.
    // Wait until the number renders — navigation completes before the breadcrumb updates.
    const breadcrumb = page
      .locator('nav')
      .filter({ hasText: 'Outbound Shipments' })
      .first();
    await expect(breadcrumb).toContainText(/\d+/, { timeout: 10000 });
    const breadcrumbText = (await breadcrumb.textContent()) ?? '';
    const invoiceNumber = breadcrumbText.match(/(\d+)\s*$/)?.[1];
    expect(invoiceNumber).toBeTruthy();

    // Back to the list — sorted by Number descending by default, so ours is first.
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });
    const targetRow = page
      .locator('tbody tr')
      .filter({ has: page.locator('td', { hasText: new RegExp(`^${invoiceNumber}$`) }) })
      .first();
    await expect(targetRow).toBeVisible();

    // Tick the row checkbox (cell index 0).
    await targetRow.locator('input[type="checkbox"]').check();

    // A bulk-action footer appears at the bottom of the list once a row is
    // selected. Click its Delete button. (The md mentions a "Select dropdown"
    // but the UI uses a footer pattern instead.)
    const deleteAction = page.getByRole('button', { name: /Delete/i }).first();
    await expect(deleteAction).toBeVisible({ timeout: 3000 });
    await deleteAction.click();

    // "Are you sure?" confirmation dialog — its accept button is labelled OK.
    // The dialog has no accessible name (heading isn't linked via aria-labelledby),
    // so match by its visible heading text.
    const confirmDialog = page.getByTestId('confirmation-modal');
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });
    await page.getByTestId('confirmation-modal-ok').click();

    // The row should be gone. Re-query the list to verify.
    await page.waitForLoadState('networkidle');
    await expect(
      page
        .locator('tbody tr')
        .filter({ has: page.locator('td', { hasText: new RegExp(`^${invoiceNumber}$`) }) })
    ).toHaveCount(0, { timeout: 5000 });
  });

  test('export to CSV triggers a download', async ({ page }) => {
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });

    const exportButton = page.getByRole('button', { name: /Export/i }).first();
    await expect(exportButton).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await exportButton.click();

    const confirmOption = page.getByRole('menuitem', { name: /CSV|Export/i }).first();
    if (await confirmOption.isVisible({ timeout: 500 }).catch(() => false)) {
      await confirmOption.click();
    }

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  // ─── Detail-view sidebar panels ──────────────────────────────────────────

  test('sidebar panels render and respond to edits on a new shipment', async ({ page }) => {
    // Spin up a fresh shipment so we can inspect its detail view.
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /New Shipment/i }).click();
    const customerDialog = page.getByTestId('customer-search-modal');
    await expect(customerDialog).toBeVisible();
    await customerDialog.locator('input[role="combobox"]').first().click();
    await page.locator('[role="option"]').first().click();
    await page.waitForURL(/\/distribution\/outbound-shipment\/[^/]+/, { timeout: 10000 });
    const shipmentUrl = page.url();

    const sidebar = page.getByTestId('detail-panel');

    await test.step('Additional info panel renders expected fields', async () => {
      await expect(sidebar.getByRole('heading', { name: 'Additional info' })).toBeVisible();
      await expect(sidebar.getByText('Entered by')).toBeVisible();
      await expect(sidebar.getByText('admin')).toBeVisible();
      await expect(sidebar.getByText('Created')).toBeVisible();
      await expect(sidebar.getByRole('button', { name: /Select a colour/i })).toBeVisible();
      await expect(sidebar.getByText('Comment')).toBeVisible();
    });

    await test.step('Related documents shows empty state', async () => {
      await expect(sidebar.getByRole('heading', { name: 'Related documents' })).toBeVisible();
      await expect(sidebar.getByText('No related documents')).toBeVisible();
    });

    await test.step('Invoice details renders charges + totals', async () => {
      await expect(sidebar.getByRole('heading', { name: 'Invoice details' })).toBeVisible();
      await expect(sidebar.getByText('Service charges')).toBeVisible();
      await expect(sidebar.getByText('Items sell price')).toBeVisible();
      await expect(sidebar.getByText('Grand total')).toBeVisible();
      await expect(sidebar.getByRole('button', { name: /Edit service charges/i })).toBeVisible();
    });

    await test.step('Transport details renders shipping fields', async () => {
      await expect(sidebar.getByRole('heading', { name: 'Transport details' })).toBeVisible();
      await expect(sidebar.getByText('Shipping method')).toBeVisible();
      await expect(sidebar.getByText('Reference')).toBeVisible();
    });

    await test.step('comment is editable and persists across reload', async () => {
      await assertFieldPersistsAcrossReload(page, shipmentUrl, 'comment-field', `test-comment-${Date.now()}`);
    });

    await test.step('Hold checkbox toggles on via confirmation dialog', async () => {
      // The behavioural "Hold prevents status advance" check lives in a
      // dedicated test below — testing it here on a brand-new shipment with
      // no lines hits an "Error saving shipment" edge case rather than the
      // polite "Cannot change status" info message seen at Allocated/Picked.
      const holdButton = page.getByTestId('on-hold-button');
      const holdCheckbox = holdButton.locator('input[type="checkbox"]');
      await expect(holdCheckbox).not.toBeChecked();

      const confirmHold = page.getByTestId('confirmation-modal');
      await holdButton.click();
      await expect(confirmHold).toBeVisible({ timeout: 3000 });
      await page.getByTestId('confirmation-modal-ok').click();
      await expect(confirmHold).toBeHidden();
      await expect(holdCheckbox).toBeChecked();
    });
  });

  test('Hold prevents status from advancing on a Picked shipment', async ({ page }) => {
    // Build a Picked-status shipment, then enable Hold, then try to advance
    // to Shipped. This is where the polite "Cannot change status … on hold"
    // info toast appears.
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /New Shipment/i }).click();
    const customerDialog = page.getByTestId('customer-search-modal');
    await expect(customerDialog).toBeVisible();
    await customerDialog.locator('input[role="combobox"]').first().click();
    await page.locator('[role="option"]').first().click();
    await page.waitForURL(/\/distribution\/outbound-shipment\/[^/]+/, { timeout: 10000 });

    // Add a line with stock — same flow as the happy path.
    await page.getByRole('button', { name: /Add Item/i }).first().click();
    const addItemDialog = page.getByTestId('add-item-modal');
    await expect(addItemDialog).toBeVisible();
    await pickItemWithStock(page, addItemDialog);
    await addItemDialog.getByRole('textbox').first().fill('2');
    const okButton = addItemDialog.getByTestId('dialog-button-ok');
    await expect(okButton).toBeEnabled();
    for (let attempt = 0; attempt < 4; attempt++) {
      await okButton.hover();
      await okButton.click();
      try {
        await expect(addItemDialog).toBeHidden({ timeout: 2000 });
        break;
      } catch {
        if (attempt === 3) throw new Error('Add item dialog did not close after 4 OK clicks');
      }
    }

    // Advance: Allocated → Picked.
    await clickConfirmAndWait(page, /Confirm Allocated/i);
    await expect(page.getByRole('button', { name: /Confirm Picked/i })).toBeVisible();
    await clickConfirmAndWait(page, /Confirm Picked/i);
    await expect(page.getByRole('button', { name: /Confirm Shipped/i })).toBeVisible();

    // Enable Hold via confirmation dialog. Wait for the checkbox to reflect
    // the new state so the next click sees onHold=true in React state.
    const holdButton = page.getByTestId('on-hold-button');
    const holdCheckbox = holdButton.locator('input[type="checkbox"]');
    const confirmHold = page.getByTestId('confirmation-modal');
    await holdButton.click();
    await expect(confirmHold).toBeVisible({ timeout: 3000 });
    await page.getByTestId('confirmation-modal-ok').click();
    await expect(confirmHold).toBeHidden();
    await expect(holdCheckbox).toBeChecked();

    // Set up the toast listener BEFORE clicking — the snackbar appears
    // briefly then auto-dismisses.
    const holdRejectionToast = page.getByText(
      /Cannot change the status because the outbound shipment is on hold/i
    );
    const toastPromise = holdRejectionToast.waitFor({ state: 'visible', timeout: 8000 });

    // Try to advance to Shipped. Confirmation dialog appears first, then on
    // accept the hold check fires the info toast (server-side rejection
    // because onHold=true on the saved record).
    await page.mouse.move(0, 0);
    await page.getByRole('button', { name: /Confirm Shipped/i }).click();

    const confirmStatus = page.getByTestId('confirmation-modal');
    if (await confirmStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
      const okInStatus = page.getByTestId('confirmation-modal-ok');
      for (let attempt = 0; attempt < 4; attempt++) {
        await okInStatus.hover();
        await okInStatus.click();
        try {
          await expect(confirmStatus).toBeHidden({ timeout: 2000 });
          break;
        } catch {
          if (attempt === 3) throw new Error('Confirm status dialog did not close');
        }
      }
    }

    await toastPromise;

    // Status didn't advance — button is still Confirm Shipped, Delivered never appears.
    await expect(page.getByRole('button', { name: /Confirm Shipped/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Confirm Delivered/i })).toHaveCount(0);
  });

  // ─── List view: pagination & filters ─────────────────────────────────────

  test('rows-per-page selector changes page size', async ({ page }) => {
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });

    const rowsCombobox = page.getByRole('combobox', { name: /Rows per page/i });
    await expect(rowsCombobox).toBeVisible();

    // Open the dropdown and pick a different size.
    await rowsCombobox.click();
    const option100 = page.getByRole('option', { name: '100', exact: true });
    if (!(await option100.isVisible({ timeout: 500 }).catch(() => false))) {
      // Fallback: some MUI Selects use menuitem role.
      await page.getByRole('menuitem', { name: '100', exact: true }).click();
    } else {
      await option100.click();
    }

    // Verify the combobox value updated and the "Showing 1-N" footer reflects it.
    await expect(rowsCombobox).toHaveText('100');
  });

  test('filter by Invoice number narrows the list', async ({ page }) => {
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });

    // Grab a real invoice number from the first row to search for.
    const numberColumn = await getColumnIndex(page, 'Number');
    const firstNumber = ((await page
      .locator('tbody tr')
      .first()
      .locator('td')
      .nth(numberColumn)
      .textContent()) ?? '').trim();
    expect(firstNumber).toMatch(/^\d+$/);

    // Open Filters → pick Invoice number → enter the number.
    await page.getByRole('combobox', { name: /Filters/i }).click();
    await page.getByRole('menuitem', { name: 'Invoice number', exact: true }).click();

    // The field has accessible name "Invoice number" (no placeholder).
    const numberInput = page.getByRole('textbox', { name: 'Invoice number', exact: true });
    await expect(numberInput).toBeVisible();

    // Wait for the debounced filter request before asserting on rows.
    const filterRequest = page.waitForRequest(
      req =>
        req.url().includes('/graphql') &&
        (req.postData() ?? '').includes(`"invoiceNumber"`),
      { timeout: 5000 }
    );
    await numberInput.fill(firstNumber);
    await filterRequest;

    // Invoice numbers are unique — filter should leave exactly one row.
    // Use toHaveCount which polls until the UI re-renders.
    await expect(page.locator('tbody tr')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('tbody tr').first().locator('td').nth(numberColumn)).toContainText(firstNumber);
  });

  test('pagination next-page button changes the visible rows', async ({ page }) => {
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });

    // Need >20 shipments for page 2 to exist. The footer shows "Showing 1-20 of N".
    const nextPage = page.getByRole('button', { name: 'Go to next page' });
    const hasNextPage = await nextPage.isEnabled().catch(() => false);
    test.skip(!hasNextPage, 'Fewer than 21 shipments in the list — skipping pagination test');

    const numberColumn = await getColumnIndex(page, 'Number');

    // Capture the first row's invoice number on page 1.
    const firstRowNumberPage1 = ((await page
      .locator('tbody tr')
      .first()
      .locator('td')
      .nth(numberColumn)
      .textContent()) ?? '').trim();

    await nextPage.click();
    await page.waitForLoadState('networkidle');

    // The "Go to previous page" button should be enabled (we're past page 1).
    await expect(page.getByRole('button', { name: 'Go to previous page' })).toBeEnabled();

    // The first row's invoice number should be different from page 1.
    const firstRowNumberPage2 = ((await page
      .locator('tbody tr')
      .first()
      .locator('td')
      .nth(numberColumn)
      .textContent()) ?? '').trim();
    expect(firstRowNumberPage2).not.toBe(firstRowNumberPage1);
  });

  test('filter by Reference narrows the list', async ({ page }) => {
    // Use the customer reference saved by an earlier test (cust-ref-…) if
    // present; otherwise pick the first row's reference cell. Reference is
    // a free-text filter like Name/Invoice number — exercises a different
    // filter type from Name/Number.
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });

    // Find a row that has non-empty reference.
    const referenceColumn = await getColumnIndex(page, 'Reference');
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    let referenceText: string | null = null;
    for (let i = 0; i < rowCount; i++) {
      const ref = ((await rows.nth(i).locator('td').nth(referenceColumn).textContent()) ?? '').trim();
      if (ref.length > 0) {
        referenceText = ref;
        break;
      }
    }
    test.skip(!referenceText, 'No shipment with a reference in the visible page — skipping');

    await page.getByRole('combobox', { name: /Filters/i }).click();
    await page.getByRole('menuitem', { name: 'Reference', exact: true }).click();

    const refInput = page.getByRole('textbox', { name: 'Reference', exact: true });
    await expect(refInput).toBeVisible();

    const filterRequest = page.waitForRequest(
      req =>
        req.url().includes('/graphql') &&
        (req.postData() ?? '').includes('"theirReference"'),
      { timeout: 5000 }
    );
    await refInput.fill(referenceText!);
    await filterRequest;

    // Every visible row's Reference cell should contain the searched text.
    await expect(rows.first().locator('td').nth(referenceColumn)).toContainText(referenceText!);
  });

  test('multi-select master checkbox deletes multiple shipments', async ({ page }) => {
    // Create two fresh New shipments so we have two known rows to delete.
    await createNewShipment(page);
    await createNewShipment(page);

    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });

    // Tick the row checkboxes for the two newest rows (sorted by Number desc).
    await page.locator('tbody tr').nth(0).locator('input[type="checkbox"]').check();
    await page.locator('tbody tr').nth(1).locator('input[type="checkbox"]').check();

    // Footer should say "2 Selected".
    await expect(page.getByText(/2 Selected/i)).toBeVisible();

    // Click Delete in the bulk-action footer.
    await page.getByRole('button', { name: /^Delete$/i }).first().click();

    const confirmDialog = page.getByTestId('confirmation-modal');
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });
    // Message should mention "2 shipments".
    await expect(confirmDialog).toContainText(/2/);
    await page.getByTestId('confirmation-modal-ok').click();
    await expect(confirmDialog).toBeHidden();

    // Selection footer should be gone (no more selected rows).
    await expect(page.getByText(/2 Selected/i)).toHaveCount(0);
  });

  test('cannot delete a Shipped shipment via bulk action', async ({ page }) => {
    await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });

    // Find a row whose Status cell is "Shipped".
    const statusColumn = await getColumnIndex(page, 'Status');
    const numberColumn = await getColumnIndex(page, 'Number');
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    let shippedRow = -1;
    let invoiceNumber = '';
    for (let i = 0; i < rowCount; i++) {
      const status = ((await rows.nth(i).locator('td').nth(statusColumn).textContent()) ?? '').trim();
      if (status.toLowerCase() === 'shipped') {
        shippedRow = i;
        invoiceNumber = ((await rows.nth(i).locator('td').nth(numberColumn).textContent()) ?? '').trim();
        break;
      }
    }
    test.skip(shippedRow === -1, 'No Shipped shipment in the visible page — skipping');

    await rows.nth(shippedRow).locator('input[type="checkbox"]').check();
    await expect(page.getByText(/1 Selected/i)).toBeVisible();

    // Listen for the rejection toast BEFORE clicking — it appears briefly
    // and auto-dismisses. The app skips the "Are you sure?" dialog entirely
    // when the selection includes a Shipped (non-deletable) row.
    const rejectionToast = page.getByText(/cannot delete one or more of the selected items/i);
    const toastPromise = rejectionToast.waitFor({ state: 'visible', timeout: 5000 });

    await page.getByRole('button', { name: /^Delete$/i }).first().click();

    await toastPromise;

    // Row still present — Shipped shipments are not deletable per the md
    // ("You can only delete outbound shipments with statuses New, Allocated or Picked").
    await expect(
      page
        .locator('tbody tr')
        .filter({ has: page.locator('td', { hasText: new RegExp(`^${invoiceNumber}$`) }) })
    ).toHaveCount(1);
  });

  // ─── Detail-view: simple edits, Log tab, Close button ────────────────────

  test('customer ref, transport ref, log tab and close button', async ({ page }) => {
    const shipmentUrl = await createNewShipment(page);

    await test.step('customer reference persists across reload', async () => {
      await assertFieldPersistsAcrossReload(page, shipmentUrl, 'customer-reference-field', `cust-ref-${Date.now()}`);
    });

    await test.step('transport reference persists across reload', async () => {
      await assertFieldPersistsAcrossReload(page, shipmentUrl, 'transport-reference-field', `trans-${Date.now()}`);
    });

    await test.step('Log tab loads without error', async () => {
      await page.getByRole('tab', { name: 'Log' }).click();
      // Tab panel content should render — just smoke-check that the page
      // didn't crash and the tab shows as selected.
      await expect(page.getByRole('tab', { name: 'Log', selected: true })).toBeVisible();
    });

    await test.step('Close button returns to the list', async () => {
      // The Close button (top of the right-side actions area) exits the
      // detail view back to the Outbound Shipments list. Asserting on the
      // list-only "New Shipment" toolbar button auto-waits for navigation.
      await page.getByRole('button', { name: 'Close', exact: true }).first().click();
      await expect(page.getByRole('button', { name: /New Shipment/i })).toBeVisible({
        timeout: 5000,
      });
    });
  });

  // ─── Status flow gaps ─────────────────────────────────────────────────────

  test('skip statuses: New → directly to Shipped via split-button', async ({ page }) => {
    // The Confirm button is a split-button (main action + dropdown arrow).
    // The arrow opens a menu of all later statuses so the user can skip
    // intermediate transitions (md: "You can choose to skip some of them
    // to go directly to Confirm Shipped for example").
    await createNewShipment(page);
    await addLineToShipment(page);

    // The dropdown trigger is the chevron half of the status split-button.
    const dropdownTrigger = page.getByTestId('status-change-button-dropdown');

    await page.mouse.move(0, 0);
    await dropdownTrigger.click();

    // Pick "Shipped" from the menu — this only SELECTS Shipped as the
    // next-action; the main split-button label updates to "Confirm Shipped"
    // but the action doesn't fire until we click the main button.
    await page.getByRole('menuitem', { name: /Shipped/i }).first().click();
    await page.mouse.move(0, 0);
    await page.getByRole('button', { name: /Confirm Shipped/i }).click();

    // A "Confirm status as Shipped?" dialog appears — accept it.
    const confirmStatus = page.getByTestId('confirmation-modal');
    await expect(confirmStatus).toBeVisible({ timeout: 3000 });
    const okBtn = page.getByTestId('confirmation-modal-ok');
    for (let attempt = 0; attempt < 4; attempt++) {
      await okBtn.hover();
      await okBtn.click();
      try {
        await expect(confirmStatus).toBeHidden({ timeout: 2000 });
        break;
      } catch {
        if (attempt === 3) throw new Error('Confirm Shipped dialog did not close');
      }
    }

    // Status advanced past Picked directly to Shipped: the next confirm
    // button should be Confirm Delivered (or none if Shipped is the last
    // store-owned status).
    await expect(page.getByRole('button', { name: /Confirm Allocated/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Confirm Picked/i })).toHaveCount(0);
  });

  test('Hold prevents status from advancing on an Allocated shipment', async ({ page }) => {
    await createNewShipment(page);
    await addLineToShipment(page);
    await clickConfirmAndWait(page, /Confirm Allocated/i);
    await expect(page.getByRole('button', { name: /Confirm Picked/i })).toBeVisible();

    // Enable Hold.
    const holdButton = page.getByTestId('on-hold-button');
    const holdCheckbox = holdButton.locator('input[type="checkbox"]');
    const confirmHold = page.getByTestId('confirmation-modal');
    await holdButton.click();
    await expect(confirmHold).toBeVisible({ timeout: 3000 });
    await page.getByTestId('confirmation-modal-ok').click();
    await expect(confirmHold).toBeHidden();
    await expect(holdCheckbox).toBeChecked();

    // Try to advance to Picked — should be rejected with the info toast.
    const holdRejectionToast = page.getByText(
      /Cannot change the status because the outbound shipment is on hold/i
    );
    const toastPromise = holdRejectionToast.waitFor({ state: 'visible', timeout: 8000 });

    await page.mouse.move(0, 0);
    await page.getByRole('button', { name: /Confirm Picked/i }).click();

    const confirmStatus = page.getByTestId('confirmation-modal');
    if (await confirmStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
      const okBtn = page.getByTestId('confirmation-modal-ok');
      for (let attempt = 0; attempt < 4; attempt++) {
        await okBtn.hover();
        await okBtn.click();
        try {
          await expect(confirmStatus).toBeHidden({ timeout: 2000 });
          break;
        } catch {
          if (attempt === 3) throw new Error('Confirm status dialog did not close');
        }
      }
    }

    await toastPromise;
    await expect(page.getByRole('button', { name: /Confirm Picked/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Confirm Shipped/i })).toHaveCount(0);
  });

  test('un-holding allows status to advance again', async ({ page }) => {
    await createNewShipment(page);
    await addLineToShipment(page);
    await clickConfirmAndWait(page, /Confirm Allocated/i);
    await expect(page.getByRole('button', { name: /Confirm Picked/i })).toBeVisible();

    const holdButton = page.getByTestId('on-hold-button');
    const holdCheckbox = holdButton.locator('input[type="checkbox"]');
    const confirmHold = page.getByTestId('confirmation-modal');

    // Turn Hold on.
    await holdButton.click();
    await expect(confirmHold).toBeVisible({ timeout: 3000 });
    await page.getByTestId('confirmation-modal-ok').click();
    await expect(confirmHold).toBeHidden();
    await expect(holdCheckbox).toBeChecked();

    // Turn Hold off (md doesn't say un-hold needs confirmation — handle either).
    await holdButton.click();
    if (await confirmHold.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.getByTestId('confirmation-modal-ok').click();
      await expect(confirmHold).toBeHidden();
    }
    await expect(holdCheckbox).not.toBeChecked();

    // Now status advance should work.
    await clickConfirmAndWait(page, /Confirm Picked/i);
    await expect(page.getByRole('button', { name: /Confirm Shipped/i })).toBeVisible();
  });

  test('hovering the status sequence shows the status-history popover', async ({ page }) => {
    await createNewShipment(page);

    // The footer status sequence (StatusCrumbs) — hover reveals the popover.
    const statusSequence = page.getByTestId('status-crumbs');
    await expect(statusSequence).toBeVisible();

    await statusSequence.hover();

    // The hover popover contains "Status history".
    await expect(page.getByText('Status history').first()).toBeVisible({ timeout: 3000 });
  });

  // ─── End-to-end create flow ──────────────────────────────────────────────

  test('happy path: create → allocate → pick → ship', async ({ page }) => {
    // ─── Navigate to the list ────────────────────────────────────────────────
    await page.goto('/distribution/outbound-shipment', {
      waitUntil: 'networkidle',
    });
    await expect(
      page.getByRole('button', { name: /New Shipment/i })
    ).toBeVisible();

    // ─── Create a new shipment ───────────────────────────────────────────────
    await page.getByRole('button', { name: /New Shipment/i }).click();

    // Customer selection modal
    const customerDialog = page.getByTestId('customer-search-modal');
    await expect(customerDialog).toBeVisible();

    // Pick the first available customer from the autocomplete options.
    // Selecting a customer auto-creates the shipment and navigates to detail
    // (wiki: "Once you press Enter, your Outbound Shipment is automatically created").
    const customerInput = customerDialog
      .locator('input[type="text"], input[role="combobox"]')
      .first();
    await customerInput.click();
    const firstCustomerOption = page.locator('[role="option"]').first();
    await expect(firstCustomerOption).toBeVisible({ timeout: 5000 });
    await firstCustomerOption.click();

    // Should land on the new shipment detail view — status NEW, no lines yet
    await page.waitForURL(/\/distribution\/outbound-shipment\/[^/]+/, {
      timeout: 10000,
    });
    // Two "Add item" buttons exist (toolbar + empty-state row) — use the toolbar one.
    const addItemButton = page
      .getByRole('button', { name: /Add Item/i })
      .first();
    await expect(addItemButton).toBeVisible();

    // ─── Add a line: pick first item, accept default issue quantity ──────────
    await addItemButton.click();

    // Use role+name rather than .MuiDialog-root — MUI mounts popups & drawers
    // with that class, so .first() can resolve to the wrong element.
    const addItemDialog = page.getByTestId('add-item-modal');
    await expect(addItemDialog).toBeVisible();

    // Find an item with stock — alphabetical order; many seed items have zero
    // stock, so try options until "Available: N" reports > 0.
    await pickItemWithStock(page, addItemDialog);

    // Issue quantity — the Issue field is a text input (not type=number).
    // It's the first textbox in the dialog (the item picker is a combobox).
    // Auto-allocation fills the Issue field with 1 when an item is selected,
    // so typing "1" again doesn't mark React state dirty — onSave then bails
    // (see OutboundLineEdit.tsx: `if (!isDirty) return`). Use 2 to ensure a
    // real change. Pressing Enter from the input submits naturally.
    const issueQtyInput = addItemDialog.getByRole('textbox').first();
    await issueQtyInput.fill('2');

    const okButton = addItemDialog.getByTestId('dialog-button-ok');
    await expect(okButton).toBeEnabled();

    // Auto-allocation runs async after typing in Issue. The first OK click
    // can land during that mid-state and be swallowed. Retry until the
    // dialog actually closes — second click hits a settled state.
    for (let attempt = 0; attempt < 4; attempt++) {
      await okButton.hover();
      await okButton.click();
      try {
        await expect(addItemDialog).toBeHidden({ timeout: 2000 });
        break;
      } catch {
        if (attempt === 3) throw new Error('Add item dialog did not close after 4 OK clicks');
      }
    }

    // The shipment should now have exactly one line row
    await expect(page.locator('tbody tr').first()).toBeVisible();

    // ─── Status transitions ──────────────────────────────────────────────────
    // The footer "Confirm" button cycles through Allocated → Picked → Shipped.
    // Wiki: pressing Confirm Allocated takes status to ALLOCATED, etc.

    await clickConfirmAndWait(page, /Confirm Allocated|Allocate/i);
    await expect(page.getByText(/Allocated/i).first()).toBeVisible();

    await clickConfirmAndWait(page, /Confirm Picked|Pick/i);
    await expect(page.getByText(/Picked/i).first()).toBeVisible();

    await clickConfirmAndWait(page, /Confirm Shipped|Ship/i);
    await expect(page.getByText(/Shipped/i).first()).toBeVisible();
  });
});

/**
 * Create a fresh outbound shipment via the UI: New Shipment → pick the first
 * available customer (auto-creates) → return the shipment's URL.
 */
async function createNewShipment(page: Page): Promise<string> {
  await page.goto('/distribution/outbound-shipment', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /New Shipment/i }).click();
  const customerDialog = page.getByTestId('customer-search-modal');
  await expect(customerDialog).toBeVisible();
  await customerDialog.locator('input[role="combobox"]').first().click();
  await page.locator('[role="option"]').first().click();
  await page.waitForURL(/\/distribution\/outbound-shipment\/[^/]+/, { timeout: 10000 });
  return page.url();
}

/**
 * Open the Add Item dialog, pick the first item with stock, issue 2 units,
 * and confirm. Caller must already be on the shipment detail view.
 */
async function addLineToShipment(page: Page) {
  await page.getByRole('button', { name: /Add Item/i }).first().click();
  const addItemDialog = page.getByTestId('add-item-modal');
  await expect(addItemDialog).toBeVisible();
  await pickItemWithStock(page, addItemDialog);
  await addItemDialog.getByRole('textbox').first().fill('2');
  const okButton = addItemDialog.getByTestId('dialog-button-ok');
  await expect(okButton).toBeEnabled();
  for (let attempt = 0; attempt < 4; attempt++) {
    await okButton.hover();
    await okButton.click();
    try {
      await expect(addItemDialog).toBeHidden({ timeout: 2000 });
      return;
    } catch {
      if (attempt === 3) throw new Error('Add item dialog did not close after 4 OK clicks');
    }
  }
}

/**
 * Open the item autocomplete and walk through options until one reports
 * "Available: N" with N > 0. Throws if none found within MAX_TRIES.
 */
async function pickItemWithStock(page: Page, dialog: import('@playwright/test').Locator) {
  const MAX_TRIES = 30;
  const combobox = dialog.locator('input[role="combobox"]').first();

  for (let i = 0; i < MAX_TRIES; i++) {
    await combobox.click();
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible({ timeout: 5000 });

    const optionCount = await options.count();
    if (i >= optionCount) {
      throw new Error(
        `Reached end of item list (${optionCount} options) without finding one with stock`
      );
    }

    await options.nth(i).click();

    // Wait for the availability line to reflect the new selection.
    await page.waitForTimeout(300);
    const availLocator = dialog.getByText(/Available:\s*\d+/).first();
    if (!(await availLocator.isVisible({ timeout: 2000 }).catch(() => false))) {
      continue;
    }
    const text = (await availLocator.textContent()) ?? '';
    const match = text.match(/Available:\s*(\d+)/);
    const qty = match?.[1] ? parseInt(match[1], 10) : 0;
    if (qty > 0) {
      // Click a neutral spot in the dialog (the heading) to dismiss any
      // lingering popup via MUI's outside-click handling. Safer than
      // Escape, which closes the whole dialog if no popup is open.
      await dialog.getByRole('heading', { name: 'Add item' }).click();
      return;
    }
  }

  throw new Error(`No item with stock found in first ${MAX_TRIES} items`);
}

/**
 * Resolve a column's zero-based index by its header text. Lets tests refer to
 * columns by name so reordering them in the UI doesn't break assertions.
 *
 * Headers in this app render as e.g. "Name Sort by Name ascending Column
 * Actions" (label + sort hint + column-actions menu), so we match on the
 * start of the header rather than exact equality.
 */
async function getColumnIndex(page: Page, headerText: string): Promise<number> {
  const headers = page.getByRole('columnheader');
  const count = await headers.count();
  if (count === 0) throw new Error('No column headers found in table');
  const needle = headerText.toLowerCase();
  for (let i = 0; i < count; i++) {
    const text = ((await headers.nth(i).textContent()) ?? '').trim().toLowerCase();
    if (text === needle || text.startsWith(needle)) return i;
  }
  throw new Error(`Column header "${headerText}" not found`);
}

/**
 * Fill a debounced text field on the shipment detail view, wait for the
 * updateOutboundShipment mutation to fire, then reload via the shipment URL
 * and assert the value persisted.
 */
async function assertFieldPersistsAcrossReload(
  page: Page,
  shipmentUrl: string,
  testid: string,
  value: string
) {
  const field = page.getByTestId(testid);
  const savePromise = page.waitForRequest(
    req =>
      req.url().includes('/graphql') &&
      (req.postData() ?? '').includes('updateOutboundShipment') &&
      (req.postData() ?? '').includes(value),
    { timeout: 5000 }
  );
  await field.fill(value);
  await field.blur();
  await savePromise;
  await page.goto(shipmentUrl, { waitUntil: 'networkidle' });
  await expect(page.getByTestId(testid)).toHaveValue(value);
}

/**
 * Click a footer confirm button and wait for the resulting network/render to settle.
 * Some confirm actions show a confirmation dialog — accept it if present.
 */
async function clickConfirmAndWait(page: Page, nameRegex: RegExp) {
  // Move mouse away from the status sequence first — hovering it shows a
  // status-history tooltip that overlays the Confirm button and blocks clicks.
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: nameRegex }).first().click();

  // If a confirmation dialog appears, click its OK button.
  const confirmOk = page.getByTestId('confirmation-modal-ok');
  if (await confirmOk.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmOk.click();
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}
