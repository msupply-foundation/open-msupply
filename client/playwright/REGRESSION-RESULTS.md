# OMS regression suites — results & cross-FE matrix

Deterministic Playwright coverage of the behaviour-anchored regression cases in
the (private) `tmf-testing` repo (PR #10). Each test carries a `covers`
annotation naming the behaviour ID(s) it exercises; the tables below are rolled
up from those annotations.

**What was tested:** the **RC v3** line (`3.00.00-RC` / `v3.0.0-RC`), against two
front-ends sharing the same backend, store and reference datafile:

| Port | Front-end | Notes |
|------|-----------|-------|
| **:3006** | Current app (React + MUI + Material-React-Table) — the RC v3 FE in this repo | full app; login + store select; large real client datafile |
| **:3100** | Greenfield **"Thin React"** stocktake rebuild (`esmehm/rnd-the-fe#1`) — React + TanStack Table + React Aria + vanilla-extract, **no MUI** | **stocktake-only** prototype; **no auth**; `/graphql`→:8000 proxy |

Selectors in both suites use **roles / accessible names / visible label text /
table column headers only** — no `data-testid`, no CSS classes — so they are
resilient to incidental refactors of the FE they were written against.

> Roll-up rule: a behaviour ID exercised by more than one test takes
> **worst-status-wins** (a single failing test fails the ID).

Reproduce:

```bash
cd client/playwright
# :3006 (current FE) — uses login + stored auth
set -a && source .env && set +a          # BASE_URL=http://localhost:3006, creds
npx playwright test stocktake-regression   --workers 1 --project=chromium
npx playwright test distribution-regression --workers 1 --project=chromium

# :3100 (Thin React) — no auth, parallel/independent
BASE_URL=http://localhost:3100 PW_MODE=parallel \
  npx playwright test stocktake-regression --config=playwright.3100.config.ts --workers 4
```

---

## 1. Distribution suite — :3006 (RC v3, current FE)

`distribution-regression.spec.ts` — 31 tests.

| Behaviour ID | Status | Test |
|---|---|---|
| OMS-REG-DIST-01.1 | ✅ PASS | list view renders core controls |
| OMS-REG-DIST-01.2 | ✅ PASS | pagination next-page button |
| OMS-REG-DIST-01.3 | ✅ PASS | rows-per-page selector |
| OMS-REG-DIST-01.4 | ✅ PASS | search by customer name |
| OMS-REG-DIST-01.6 | ✅ PASS | export to CSV |
| OMS-REG-DIST-01.7 | ✅ PASS | delete a New-status shipment (bulk) |
| OMS-REG-DIST-01.8 | ⏭️ SKIP | cannot delete a Shipped shipment *(no Shipped in data)* |
| OMS-REG-DIST-01.9 | ✅ PASS | multi-select bulk delete |
| OMS-REG-DIST-01.10 | ✅ PASS | filter by Invoice number |
| OMS-REG-DIST-01.11 | ⏭️ SKIP | filter by Reference *(no ref in data)* |
| OMS-REG-DIST-01.12 | ✅ PASS | filter by Status |
| OMS-REG-DIST-01.13 | ✅ PASS | pagination page-number click |
| OMS-REG-DIST-02.1, 02.5 | ✅ PASS | sidebar panels render / edit |
| OMS-REG-DIST-02.1, 04.1, 04.2, 04.7 | ❌ FAIL | happy path: create→allocate→pick→ship |
| OMS-REG-DIST-02.3, 02.6 | ✅ PASS | customer/transport ref, log tab |
| OMS-REG-DIST-02.4 | ✅ PASS | colour picker |
| OMS-REG-DIST-02.8 | ⏭️ SKIP | Edit service charges *(no default service item)* |
| OMS-REG-DIST-02.10 | ❌ FAIL | Hold blocks advance (Picked) |
| OMS-REG-DIST-02.10 | ❌ FAIL | Hold blocks advance (Allocated) |
| OMS-REG-DIST-02.11 | ❌ FAIL | un-holding allows advance |
| OMS-REG-DIST-02.13 | ✅ PASS | status-history hover popover |
| OMS-REG-DIST-03.1 | ❌ FAIL | Add Item: type-to-filter |
| OMS-REG-DIST-03.1 | ❌ FAIL | Add Item: OK & Next |
| OMS-REG-DIST-03.13 | ❌ FAIL | Edit shipment line (item locked) |
| OMS-REG-DIST-03.14 | ❌ FAIL | Delete shipment line |
| OMS-REG-DIST-04.8 | ❌ FAIL | Shipped: line click does nothing |
| OMS-REG-DIST-04.12 | ❌ FAIL | skip statuses New→Shipped |
| OMS-REG-DIST-05.1 | ✅ PASS | Requisitions list view |
| OMS-REG-DIST-06.2 | ✅ PASS | New manual requisition |
| OMS-REG-DIST-07.1 | ✅ PASS | Returns list view |
| OMS-REG-DIST-07.4 | ✅ PASS | New return → detail |

**Total 31: ✅ 18 · ❌ 10 · ⏭️ 3.**

Every failure is a test that must **add a shipment line first** (or a whole
DIST-03/04 line/workflow behaviour), which drives the slow `itemStockOnHand`
picker on the large datafile. Everything that doesn't touch the item picker —
all of list-view (01.\*), sidebar/config (02.1/02.3/02.4/02.5/02.6/02.13),
returns (07.\*), requisitions (05/06) — passes.

> Note the two multi-test IDs: **02.1** is anchored to two tests (sidebar
> passes, happy-path fails → worst-status-wins = FAIL); the **happy-path test
> alone carries 4 IDs** (02.1, 04.1, 04.2, 04.7) — when it times out on the item
> picker, all four go unverified at once.

---

## 2. Stocktake suite — :3006 (RC v3, current FE)

`stocktake-regression.spec.ts` — 21 tests (OMS-REG-INV-03 / INV-04 / SMV-01).

| Behaviour ID | Status | Test |
|---|---|---|
| OMS-REG-INV-03.8 | ✅ PASS | list view renders core controls |
| OMS-REG-INV-03.4, 03.5 | ✅ PASS | create modal: full / filtered / blank + sub-options |
| OMS-REG-INV-03.8 | ✅ PASS | Blank stocktake opens with no lines |
| OMS-REG-INV-03.4 | ✅ PASS | Full "items with stock on hand" loads lines |
| OMS-REG-INV-03.9 | ✅ PASS | default description "Created by … on …" |
| OMS-REG-INV-03.10 | ✅ PASS | description edits persist across reload |
| OMS-REG-INV-03.11 | ✅ PASS | Add item: search by name filters options |
| OMS-REG-INV-03.12 | ✅ PASS | Add item: search by item code filters options |
| OMS-REG-INV-03.22, 03.23 | ✅ PASS | line-edit modal: Batch / Pricing / Other tabs |
| OMS-REG-INV-03.20, 03.27 | ✅ PASS | snapshot read-only; counted ≠ snapshot needs a reason |
| OMS-REG-INV-03.26 | ✅ PASS | Add batch adds a blank batch line |
| OMS-REG-INV-03.32 | ✅ PASS | Cancel closes line-edit without saving |
| OMS-REG-INV-03.13, 03.30 | ✅ PASS | Ok saves the line; item appears in list |
| OMS-REG-INV-03.40 | ✅ PASS | Log tab loads |
| OMS-REG-INV-03.33 | ✅ PASS | delete selected line → empty state |
| OMS-REG-INV-03.36 | ❌ FAIL | bulk "Reduce to 0" sets counted to 0 |
| OMS-REG-INV-03.41, 03.42 | ✅ PASS | delete stocktake (cancel + confirm) |
| OMS-REG-INV-04.2, 04.3 | ✅ PASS | finalise with reason → status Finalised |
| OMS-REG-INV-04.8, 04.9 | ✅ PASS | finalised stocktake is read-only |
| OMS-REG-INV-04.11 | ✅ PASS | on-hold makes stocktake read-only |
| OMS-REG-SMV-01.1, 01.2 | ✅ PASS | finalising an increase raises batch qty (same line) |

**Total 21: ✅ 20 · ❌ 1.**

Unlike distribution, the stocktake item picker resolved reliably here (once the
central item catalogue on `:8000` was reachable), so the item-dependent tests
pass. The one failure:

- **INV-03.36 (Reduce to 0)** — "Reduce to 0" opens an *Are you sure?*
  confirmation that requires a valid **negative-adjustment reason**; on this
  datafile the confirmed reduction is not reflected on the line
  (`counted` stays `-`). Needs a datafile with the right reason reference data,
  or a closer look at the reduce-to-zero save path — under investigation.

Coverage scope: the suite deliberately targets the automatable, deterministic
subset. Out of scope (flagged non-automatable / data-dependent in the cases):
master-list / location / VVM / expiring-before initialisation filters, the
expiry calendar widget, item variants, the vaccine VVM dropdown, bulk
change-location, print output, and the stock-ledger views (SMV-01 .3–.6).

---

## 3. Cross-FE matrix — :3006 vs :3100

Same suites, same backend/datafile, run against both front-ends. This is the
differential the RnD bake-off cares about: **does a suite built with resilient
(role/label/text) selectors transfer to a from-scratch rebuild of the same
screen?**

### Stocktake

| Behaviour ID(s) | :3006 (MUI) | :3100 (Thin React) |
|---|---|---|
| INV-03.8 — list controls | ✅ | ❌ |
| INV-03.4/.5 — create modal | ✅ | ❌ |
| INV-03.8 — blank stocktake | ✅ | ❌ |
| INV-03.4 — full stocktake | ✅ | ❌ |
| INV-03.9 — default description | ✅ | ❌ |
| INV-03.10 — description persists | ✅ | ❌ |
| INV-03.11 — search by name | ✅ | ❌ |
| INV-03.12 — search by code | ✅ | ❌ |
| INV-03.22/.23 — line-edit tabs | ✅ | ❌ |
| INV-03.20/.27 — snapshot / reason gate | ✅ | ❌ |
| INV-03.26 — add batch | ✅ | ❌ |
| INV-03.32 — cancel line-edit | ✅ | ❌ |
| INV-03.13/.30 — save line | ✅ | ❌ |
| INV-03.40 — Log tab | ✅ | ❌ |
| INV-03.33 — delete line | ✅ | ❌ |
| INV-03.36 — reduce to 0 | ❌ | ❌ |
| INV-03.41/.42 — delete stocktake | ✅ | ❌ |
| INV-04.2/.3 — finalise → Finalised | ✅ | ❌ |
| INV-04.8/.9 — finalised read-only | ✅ | ❌ |
| INV-04.11 — on-hold read-only | ✅ | ❌ |
| SMV-01.1/.2 — ledger increase | ✅ | ❌ |
| **Totals** | **20 / 21** | **0 / 21** |

### Distribution

| Suite | :3006 (MUI) | :3100 (Thin React) |
|---|---|---|
| distribution-regression (31 tests) | 18 pass / 10 fail / 3 skip | **0 / 31 — N/A** |

`:3100` is a **stocktake-only** prototype: the distribution routes don't exist,
so the whole distribution suite fails at navigation. Recorded as N/A rather than
a meaningful regression.

### Why the stocktake suite scores 0/21 on :3100

The rebuild keeps the **same URL** (`/inventory/stocktakes`) and the
create → detail navigation works, but it re-implements every control with
different copy and a different accessibility tree, so the selectors miss.
Grouped by the first assertion that failed:

| Divergence on :3100 | Behaviours it blocks |
|---|---|
| **No "Rows per page"** — uses numbered pagination (`1-20 of 68`, First/Prev/Next/Last) | list controls |
| **Create-modal copy differs** — e.g. "create a blank stocktake" text not present | create-modal, blank, full |
| **Description field** — no "Description:" label row in the detail toolbar | default description, persistence |
| **"Add item" dialog** — `dialog[name="Add item"] > combobox` not found (React-Aria structure) | every line-edit / finalise / SMV test (12 tests) |
| **Side-panel "Delete"** — no such button on the detail view | Log-tab, delete-stocktake |
| **"On hold"** — control named/shaped differently | on-hold |
| Status text is UPPERCASE (`NEW` / `FINALISED`) vs `New` / `Finalised` | (secondary) |

**Takeaway for the bake-off:** role/label/text selectors are resilient to
*incidental* change on the FE they were authored against (20/21 on :3006), but
they do **not** transfer to a *greenfield* reimplementation that changes copy and
ARIA structure — even when the behaviour is equivalent. Cross-FE differential
testing needs a **shared contract** both FEs commit to: agreed `data-testid`s, or
an agreed accessible-name + copy spec, anchored to the same behaviour IDs.
