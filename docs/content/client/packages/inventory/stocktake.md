+++
title = "Stocktake User Guide"
weight = 20
sort_by = "weight"
template = "docs/page.html"

[extra]
source = "code"
+++

# Stocktake User Guide

A **stocktake** is a physical inventory count used to reconcile the stock
quantities recorded in open mSupply against the stock actually on the shelves.
When a stocktake is finalised, open mSupply automatically generates inventory
adjustment invoices for any differences, so your stock-on-hand figures always
match what was counted.

This guide walks through the full stocktake workflow: creating a stocktake,
counting items, resolving variances, and finalising the count.

---

## 1. Overview

Use a stocktake when you need to:

- Perform a periodic full inventory count for your store.
- Spot-check a specific **location**, **master list**, or set of items close
  to expiry.
- Record the initial stock balance for a newly set up store.
- Write stock off (e.g. expired or damaged) or write stock on (e.g. items
  found on the shelf but not in the system).

Each stocktake has a unique number within your store and moves through two
statuses:

| Status        | Meaning                                                                 |
|---------------|-------------------------------------------------------------------------|
| **New**       | The stocktake is in progress. Lines can be added, edited, and deleted.  |
| **Finalised** | The stocktake has been confirmed. It becomes read-only and inventory adjustments are generated. |

Status changes are one-way — once a stocktake is **Finalised** it cannot be
reopened.

---

## 2. Accessing Stocktakes

From the side navigation, open **Inventory → Stocktakes** to view the list of
all stocktakes for your store. The list shows the stocktake number,
description, status, creation date, and the user who created it.

Click any row to open that stocktake. Click **New Stocktake** in the top
toolbar to begin a new count.

---

## 3. Creating a Stocktake

When you click **New Stocktake**, a dialog asks which kind of stocktake you
want to create. Three options are available.

### 3.1 Full Stocktake

Creates a stocktake pre-populated with every item currently held in stock.

- **Include all items** — tick this to also include items whose current
  stock-on-hand is zero. This is useful when you want to record new
  deliveries that are not yet in the system.

### 3.2 Filtered Stocktake

Creates a stocktake pre-populated with a subset of items matching filters you
choose. Combine any of the following:

- **Master list** — only include items that appear on the selected master
  list.
- **Location** — only include stock stored in the selected location.
- **Items expiring before** — only include stock lines that expire before the
  given date. Useful for expiry checks.
- **VVM status** — only include items matching the selected Vaccine Vial
  Monitor status (when the VVM preference is enabled).
- **Include all items** — as above, includes items with zero stock.

The dialog shows an estimated number of lines that will be generated before
you confirm. Open mSupply also auto-generates a **Comment** describing the
filters you applied so the purpose of the stocktake is clear later.

### 3.3 Blank Stocktake

Creates an empty stocktake. You add the items you want to count manually via
the **Add Item** button. Use this when you only want to count a handful of
known items.

### 3.4 Initial Stocktake

Only one **initial stocktake** can be created per store. It is intended for
brand-new stores that do not yet have any stock recorded. The stocktake is
pre-populated with items from the master lists configured for the store, with
a snapshot quantity of zero. Count what is physically on the shelves and
finalise to record the opening balance.

---

## 4. Counting Stock — the Detail View

After creating a stocktake, you land on the **Detail View**, which is where
all counting is done.

### 4.1 Header Fields

At the top of the stocktake you can edit:

- **Description** — short free-text label shown in the stocktake list.
- **Comment** *(side panel, Additional Info)* — longer notes describing the
  purpose of the stocktake.
- **Counted by** — name or ID of the person doing the count.
- **Verified by** — name or ID of the person verifying the count.

### 4.2 The Line Table

Each row represents one stock line (item + batch + location combination). The
key columns are:

| Column              | Meaning                                                                                          |
|---------------------|--------------------------------------------------------------------------------------------------|
| **Item code / name**| The item being counted.                                                                          |
| **Batch**           | Batch number for the stock line. Can be edited.                                                  |
| **Expiry**          | Expiry date for the batch.                                                                       |
| **Location**        | Where the stock is stored. Can be edited.                                                        |
| **Pack size**       | Units per pack.                                                                                  |
| **Snapshot packs**  | Number of packs recorded in open mSupply **at the time the line was added**. Read-only.          |
| **Counted packs**   | Number of packs you physically counted. This is the field you fill in.                           |
| **Difference**      | `Counted − Snapshot`. Positive values will produce a stock-in adjustment; negative a stock-out.  |
| **Reason**          | Required when **Difference ≠ 0** (e.g. *Expired*, *Damaged*, *Found*, *Stock take error*).       |

> **Tip:** The snapshot quantity is frozen when the line is added. If stock
> moves in or out of your store after that moment, the line will fail to
> finalise — see [Validation](#7-validation-rules) below.

### 4.3 Filtering and Searching

Use the search box at the top of the toolbar to filter lines by item name or
code. Lines are grouped by item, so all batches of the same item appear
together.

### 4.4 Adding Items Manually

Click **Add Item** to open the line editor. Choose an item, then for each
batch you want to count enter the batch details and the counted quantity.
The editor prevents adding the same stock line twice.

When adding a line for an item you do not yet have in the system, a new stock
line is created on finalisation with *Inventory Adjustment* as the supplier.

### 4.5 Editing a Line

Click a row to open the line editor. You can edit:

- Location, batch, expiry date, manufacture date
- Pack size, cost price per pack, sell price per pack
- Counted number of packs
- Reason for variance
- Note and comment
- Item variant, donor, manufacturer, campaign
- VVM status (if the VVM preference is enabled)

Use the arrow controls to step between items without leaving the editor.

### 4.6 Bulk Actions

Select one or more rows using the row checkboxes to enable bulk actions in
the footer:

- **Change location** — move the selected lines to a different location.
- **Reduce to zero** — set the counted packs to zero for all selected lines
  (useful if a location was cleared out). A reason is still required.
- **Delete** — remove the selected lines from the stocktake.

### 4.7 Locking a Stocktake (On Hold)

While a stocktake is in **New** status you can lock it (**On Hold**) to
prevent accidental edits, for example when the physical count is paused
overnight. A locked stocktake cannot be edited, deleted, or finalised until
it is unlocked again.

---

## 5. Finalising a Stocktake

When every line you intend to count has a value in **Counted packs** and any
variances have a reason, click **Save and Confirm Finalised** in the footer.

Open mSupply will:

1. **Validate** the stocktake (see next section).
2. **Delete** any lines that were never counted (counted packs left empty).
3. **Update** the stock lines — new quantities, batch, expiry, prices,
   location, variant, donor, VVM status etc. are written through to the
   underlying stock.
4. **Generate inventory adjustment invoices**:
   - A **Stock-In / Inventory Addition** invoice for any surpluses.
   - A **Stock-Out / Inventory Reduction** invoice for any shortages.
   Both adjustments are created in **Verified** status automatically.
5. **Lock** the stocktake. Status becomes **Finalised** and the finalised
   date and time are recorded.

A banner at the top of a finalised stocktake reminds you that it is
read-only. You can still view all lines and open the generated adjustment
invoices from the sidebar.

---

## 6. Validation Rules

Before a stocktake can be finalised, open mSupply checks:

- **At least one line has been counted.** Uncounted lines are removed
  automatically — they do not block finalisation.
- **Every line with a variance has a reason.** If `Counted ≠ Snapshot`, the
  reason dropdown must be set.
- **The snapshot still matches the current stock on hand.** If stock has been
  issued, prescribed, or otherwise moved since the line was added to the
  stocktake, the snapshot is stale. Delete the affected line and add it again
  so a fresh snapshot is taken, then recount.
- **Stock will not go below zero.** You cannot count a quantity that would
  drop total or available packs below zero. This normally indicates the line
  needs to be deleted and re-added, or that there is an unprocessed
  outbound invoice still to reduce the stock.
- **The stocktake is not locked.** Unlock it first.

If any check fails, open mSupply highlights the offending lines and explains
what needs to change.

---

## 7. After Finalisation

- The stocktake is **read-only**. Edits, line changes, deletions, and
  status changes are no longer possible.
- Two invoices may have been generated. Open them from the side panel to see
  exactly which items were adjusted and in what quantities.
- Stock lines reflect the counted quantities, edited batches, prices,
  locations, and so on. Any pending outbound transactions using this stock
  can now be processed against the corrected balances.
- Reasons captured against each variance are retained for reporting and
  audit.

---

## 8. Deleting a Stocktake

A stocktake can only be deleted while it is in **New** status **and** not
locked. Finalised stocktakes cannot be deleted because their inventory
adjustments have already affected stock. To reverse a finalised stocktake,
create a new stocktake (or appropriate inventory adjustment invoices) with
the correcting values.

To delete, open the stocktake list, tick the row, and click **Delete** in the
footer.

---

## 9. Tips and Best Practice

- **Count in a quiet period.** Because snapshots are taken when a line is
  added, moving stock while the count is in progress can cause validation
  failures on finalisation. Plan the count for a time when issues and
  receipts are paused, or lock the stocktake while counting.
- **Use filters for targeted counts.** Don't do a full stocktake when you
  only need to recount one location or one master list — a filtered
  stocktake is faster and produces a cleaner audit trail.
- **Always record a reason.** Even for expected variances, pick the most
  accurate reason. Variance reasons power the inventory adjustment reports
  used for loss analysis and auditing.
- **Tick "Include all items" sparingly.** For routine counts this adds a lot
  of zero-stock lines. Use it only when you genuinely want to record new
  stock or confirm that items truly are out of stock.
- **Fill in Counted by and Verified by.** They are stored on the stocktake
  record and are invaluable when reviewing counts after the fact.
- **Use the description field meaningfully.** For example,
  *"April 2026 monthly count — Cold room"* is much easier to find later than
  the default.

---

## 10. Related Documentation

- **Inventory adjustments** — the stock-in and stock-out invoices created by
  a finalised stocktake.
- **Locations** — storage locations referenced by stocktake lines.
- **Master lists** — the curated item lists used to filter stocktakes.
- **Reason options** — the variance reasons available when counted packs
  differ from snapshot packs.
