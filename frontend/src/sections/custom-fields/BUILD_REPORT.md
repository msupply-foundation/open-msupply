# Custom fields — build report

**Target stack:** SolidJS + Vite, shared component library in [`src/ui/`](../../ui/), roles resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md). Built from [`spec/custom-fields`](../../../spec/custom-fields/README.md) (`rules.md` → `contract.md` → `cases/OMS-REG-CF-02` → `ui-surface.md`), pattern-matched to the reference vertical `src/sections/stocktakes/` and to `src/sections/help/` (the other central-admin screen).

**Shape.** One screen (`ui-surface` S1) plus two confirmations (S2, S3). Definitions are sync-owned configuration, so the vertical owns exactly one editable attribute — a placement's display mode:

| File                         | What it is                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `customFieldConfig.graphql`  | the configuration read + the placement write, with each wire trap noted at its call site |
| `scopes.ts`                  | the nine scopes, hard-coded (the wire's `scope` is a free-form String)                   |
| `placement.ts`               | the ordered Hidden→Visible→Prominent axis and the pending-change buffer (pure)           |
| `customFieldConfigApi.ts`    | the two calls in the fixed data-access shape                                             |
| `CustomFieldsConfigPage.tsx` | S1 + the two confirmation dialogs                                                        |
| `index.tsx`                  | the route, behind the central-server + server-admin gate                                 |

## Anchor coverage

Behaviour anchors: [`spec/custom-fields/cases/OMS-REG-CF-02`](../../../spec/custom-fields/cases/OMS-REG-CF-02%20-%20Validate%20Custom%20Field%20Visibility%20Management.md). Note that `.7`–`.17` are **pending QA sign-off** (spec README) — the tests cite them anyway, so a renamed sub-ID is a one-line change here.

| Anchor  | Statement (abbrev.)                                          | Test                                                                                                      |
| ------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **.1**  | nav entry only for a server admin on central                 | `access.test.ts` — registry row + `gateNav` in all four pairings                                          |
| **.15** | read and save refused off central / to a non-admin           | `access.test.ts` — `routeAccess` blocked in all three failing pairings (client mirror; server half below) |
| **.2**  | nine scope tabs; Prominent only on the invoice scopes        | `placement.test.ts` › scope tabs and their controls                                                       |
| **.3**  | all fields listed, hidden ones included                      | `placement.test.ts` › every placed field is listed…; `customFieldConfigApi.test.ts` › reading one scope…  |
| **.8**  | configured order; no sort/filter/search/selection/paging     | `placement.test.ts` › rows in configured order… (order preserved + the wire asked for nothing but scope)  |
| **.9**  | value type as a read-only label, read-only name              | `placement.test.ts` › a row shows its value type…                                                         |
| **.16** | empty scope shows the empty state; unknown scope reads empty | `customFieldConfigApi.test.ts` › reads an unknown scope as EMPTY… + distinguishes a failed read…          |
| **.6**  | Save enabled only while a change is pending                  | `placement.test.ts` › Save is enabled only while…; `customFieldConfigApi.test.ts` › sends nothing when…   |
| **.10** | a save carries only this scope's changed placements          | `placement.test.ts` + `customFieldConfigApi.test.ts` › sends one scope and only its changed placements    |
| **.11** | all-or-nothing                                               | `customFieldConfigApi.test.ts` › reports the untyped rejection as a failure… (+ live probe, C2 below)     |
| **.12** | scope switch with pending changes asks to confirm            | ⚠️ **manual/e2e only** — see below                                                                        |
| **.13** | leaving the screen with pending changes warns                | ⚠️ **manual/e2e only** — see below                                                                        |
| **.17** | a re-shown promoted field returns as plain Visible           | `placement.test.ts` › the display mode is one ordered axis                                                |

### Exemptions (C1: listed, never dropped)

| Anchor           | Why it is not a colocated test                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **.7**           | Retired and unrecognised definitions are excluded **server-side**, over the loaded rows; neither is expressible in the schema and neither is reachable through the wire (spec README known gaps). The client's obligation is the negative one — never re-add or re-derive — asserted by `configRows` returning the server's nodes unchanged and unsorted (`placement.test.ts`).                                                    |
| **.4**, **.5**   | The **effect on record surfaces** — a hidden field leaving an item / invoice surface, a promoted field reaching the invoice toolbar. Owned by [`ui-standards/custom-fields`](../../../spec/ui-standards/custom-fields.md) and the consuming verticals (`src/domain/customFields`, items, names, patients, the five invoice verticals), not by this screen. Cross-vertical, so `e2e/` territory.                                    |
| **.12**, **.13** | Both guards are **dialog interactions** — `vitest` here is node-only (`vitest.config.ts`: `environment: 'node'`, `include: src/**/*.test.ts`), so there is no colocated rendering test to write. Both were driven by hand against the running app (below) and belong in the `e2e/` suite this vertical still lacks. `.13`'s mechanism is the shared `createConfirmOnLeave` primitive, already tested nowhere but by its consumers. |
| **.14**          | Sync fan-out of a placement change from central to a remote, end-to-end. Needs a sync run between two sites — environment this stack's unit tests cannot provide. Immediacy on central WAS verified live (C2 below). Also a spec-side known gap.                                                                                                                                                                                   |

## C2 — real-backend legs actually driven

Against the probe central server (`:8890`, "Tamaki Central Medical Store", `isCentralServer = true`), with the built screen running at `:3055` proxied to it:

- **The read** — all nine scopes answered field-for-field matching the sync seeder (item 10, customer/supplier/patient 9 each, the five invoice scopes 1/1/2/1/1), in response order, with `displayMode` populated (the read names a single scope).
- **The write** — a demote (`inbound_shipment_category` PROMINENT → VISIBLE) through the UI: Save enabled on the change, the mutation answered the whole scope's fresh configuration, the screen settled with Save disabled and no error, and the sync push count incremented (the changelog entry landed). Re-promotion through the UI restored it.
- **All-or-nothing** — a two-element batch pairing a valid change (`user_field_6` → HIDDEN) with an unknown id came back as a top-level `Bad user input` / `ScopeRowDoesNotExist`, and the valid field was left at its previous mode. Verified over the wire, not through the screen (the screen cannot produce this input — it offers only what it read).
- **The rejection's shape** — `extensions.details` is `ScopeRowDoesNotExist(\n    "no-such-field",\n)`, i.e. Rust's **pretty-printed** debug form, not the single-line `ScopeRowDoesNotExist("<id>")` the spec's contract quotes. Nothing here parses it (the inline notice is generic), so it is a spec-precision note, not a defect — recorded under candidate refinements.
- **Accessibility (C4)** — the running screen's a11y tree read: `navigation "Breadcrumb"` (Manage / **Custom fields** as the `h1`), `button "Save" [disabled]`, `tablist` with the nine tabs in spec order and one `[selected]`, `tabpanel` per scope, real `table`/`row`/`columnheader`/`cell` semantics, and every checkbox exposed as `checkbox "Visible: <field>"` / `"Prominent: <field>"` with `[checked]` reflecting the mode. Zero console errors or warnings on the page.

**Left unprobed:** the empty state and a failed read (no scope on the datafile has zero fields, and a read failure is not reachable on a healthy server); non-admin refusal (the datafile carries no second account); sync fan-out.

**Probe residue** (`:8890`, a throwaway dev database — all placements restored, verified scope-by-scope after the run):

- Three `custom_field_scope` changelog entries that cannot be withdrawn: `user_field_7`/`item` (hidden then restored, by CLI) and `inbound_shipment_category`/`inbound_shipment` (demoted then re-promoted, through the screen). Those sites' next sync replays a no-op placement change.
- The rolled-back mixed batch wrote nothing.
- No records created or deleted; `:8000` untouched.

## Flags

### Spec gaps hit

- **None blocking.** Every operation, type, enum and locale key `contract.md` / `ui-surface.md` names resolved — the nine scope keys, the six value-type keys, `label.visible` / `label.prominent`, `messages.no-custom-fields`, `error.unable-to-load-data`, `error.failed-to-save-custom-fields`, `messages.confirm-discard-custom-field-changes`, `messages.confirm-cancel-generic`, `heading.are-you-sure`, `button.save`, `manage`, `custom-fields`. **No new locale key was minted**, and no catalogue was touched.
- **`⚠️ VERIFY` items:** none — the spec carries none.

### Roles not built

None needed. Every slot resolved to a ✅ registry role: `Page` / `Header` / `Breadcrumb` / `HeaderButtons` / `Tabs`+`TabList`+`TabPanel` / `DataTable` (+ its `EmptyState`) / `Button` / `Alert` / `ConfirmDialog`.

One **registry nuance worth a row**, not an improvisation: the Visible / Prominent cells use **`BareCheckbox`** (`src/ui/elements/inputs/BareCheckbox`) with an `aria-label`, not the labelled `Checkbox`. The registry's Checkbox row is the _labelled form field_, whose visible label would repeat the column header in every cell; `BareCheckbox` is documented as THE drawn checkbox control and is what `DataTable` itself renders in cells. **Suggested registry addition:** a "Checkbox cell (data flag a user can toggle in a table)" role → `BareCheckbox` with a required accessible name — distinct from `BooleanCell` (read-only) and from `DataTable`'s own selection box.

### DIVERGENCES honoured

- **[D21]** success feedback lives in the initiating surface: a save's success is the screen settling — Save disabled, rows showing their saved placement. The current app's transient **Custom fields saved** toast is deliberately not carried (`messages.custom-fields-saved` stays unused by this build; Toast is a ⛔ reserved role that MUST NOT carry a user-initiated action's outcome). A failure is the inline `Alert`.
- **[D23]** the client mirrors only what keeps the admin out of trouble — which controls a scope offers, and the buffered-save guards. There is no second copy of the server's placement-exists check.
- **[D70]/[D94]** the availability gate hides like a capability (`centralAdmin`), so the entry is absent and the route redirects, rather than refusing with the permission dialog.
- **Captured as-is, not decided:** unticking Visible on a promoted field and re-ticking it silently demotes it to plain Visible. Built to match (`withVisible`), screen-verified. The spec README flags whether the control _should_ preserve prominence as a product call; if it flips, `withVisible` is the one function to change.

### Decisions the spec could make (candidate refinements)

1. **The rejection string is pretty-printed.** `contract.md` quotes `ScopeRowDoesNotExist("<id>")`; the live server answers the multi-line Rust debug form. Any future test that asserts on `extensions.details` needs the real shape — worth correcting in `contract.md`.
2. **`kind` is not fetched.** `contract.md` lists `CustomFieldNode.kind` as "fetched by the configuration screen, shown nowhere". Nothing on this screen renders provenance and the server already excludes definitions it cannot type, so this build omits it (payload discipline). If the spec means the fetch itself to be normative, say so; otherwise drop it from the declared-but-unread list.
3. **Where the failed-save banner sits.** `ui-surface` S1 Layout puts the inline banner in **Content**; with the fill-body table that makes it a full-bleed row above the table. Worth stating explicitly (banner above the table, full width) so a second implementation lands in the same place.
4. **The empty state's reachability.** Since no scope on any known datafile has zero fields, `messages.no-custom-fields` may be dead copy in practice. Worth a note in the spec so it isn't read as a live surface.

### Follow-ups

- **No `e2e/` suite and no `e2e/TESTIDS.md` section for this vertical.** The screen emits only ids already in the shared contract — `tab-<scope>` (from `TabList`), `header-<columnId>` / `cell-<columnId>` / `table-row` / `nothing-here` (from `DataTable`), `confirmation-modal` + `dialog-button-cancel`/`-ok` (from `ConfirmDialog`) — plus the app-wide `save-button` and a `save-error` on the failure Alert. A checkbox is reached as `cell-visible`/`cell-prominent` → `.locator('input')`, the pattern TESTIDS.md already documents for card view. **Nothing new was invented**; a "Custom fields" section should be added to TESTIDS.md when the suite is authored, which is also where `.12`, `.13`, `.4`, `.5` and `.14` belong.
- **Paired tmf-testing `status: moved` stub for OMS-REG-CF-02 is still owed** (carried from the spec stage — the case currently lives in both corpora).
- **Blocked on no shared component.** The one library-side suggestion is the checkbox-cell registry row above, which needs no new component.
