# Build report — settings

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Scoped build: **settings** only (`src/sections/settings/` wiped and regenerated from [`spec/settings/`](../../../spec/settings/)). Gates at completion: `pnpm check` ✓ · `pnpm test` ✓ (331, incl. 49 new AC-citing) · `pnpm build` ✓ (SettingsPage chunk 30.1 kB / gzip 8.9 kB; TestScannerPage split separately).

Spec: [`spec/settings/`](../../../spec/settings/) (reverse spec). Replaces the chrome placeholder page; routes (`settings: settingsRoutes` in `src/App.tsx`) and the nav entry already existed, so no shared routing/nav files changed. All cited i18n keys already existed in `src/intl/locales/en/common.json` — **zero locale keys added**. Shared-file edits: `src/config.ts` (+`SUPPORT_DATABASE_URL`, `PRINT_LABEL_TEST_URL`), `src/appData.ts` (+device-local `labelPrinterUseUsb`, per AC-LP3).

## AC coverage

| AC                                           | Coverage                                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-A1 section visibility by permission       | `sectionVisibility.test.ts`; drives `SettingsPage` gating (`hasPermission('SERVER_ADMIN')`)                                                                                                                                                 |
| AC-A2 Configuration needs central + admin    | `sectionVisibility.test.ts` (both single-condition cases hidden); gate = `isCentralServer() && SERVER_ADMIN`                                                                                                                                |
| AC-A3 hidden section's writes still rejected | server-enforced — no client leg possible; C2 real-backend leg pending (no CI harness)                                                                                                                                                       |
| AC-A4 finer Configuration permissions        | structurally implemented (section shows to any central-server admin; actions carry their own gates); verified live for the supply-level pre-check (below); Initialise-Forbidden leg pending a permission-scoped account in CI               |
| AC-DS1 language switch has no save step      | `DisplaySettingsSection` reuses the shared `LanguageSelector` + `changeLanguage` directly (switch itself owned by i18n)                                                                                                                     |
| AC-DS2 theme requires valid JSON             | `display/displayLogic.test.ts`; verified live — invalid JSON shows the inline parse error, no request                                                                                                                                       |
| AC-DS3 valid theme save reloads              | implemented (`saveTheme` → `location.reload()` on success); C2 leg pending (a real save would re-theme the dev server)                                                                                                                      |
| AC-DS4/DS6 toggle-off clears immediately     | `displayLogic.test.ts` (single-field clear inputs); toggle-off fires the mutation with no Save step, no reload                                                                                                                              |
| AC-DS5 logo has no content validation        | `displayLogic.test.ts` (arbitrary text builds a save input)                                                                                                                                                                                 |
| AC-SY1 save disabled until all four filled   | `sync/syncForm.test.ts`; verified live (password blank → Save disabled)                                                                                                                                                                     |
| AC-SY2 password always starts blank          | `syncForm.test.ts` (`initialSyncForm` never carries a password — the query cannot return one); verified live against stored settings                                                                                                        |
| AC-SY3 live check before persisting          | **verified against the real backend**: wrong password → "Incorrect site name or password" (variant-mapped via the sync vertical's `syncErrorSummary`) + full-error expander, previous settings intact; unstructured-failure fallback tested |
| AC-SY4 successful save persists + confirms   | implemented (`success.sync-settings` inline, refetch, password re-blanked); C2 leg pending (needs the real central password)                                                                                                                |
| AC-SY5 unchanged target skips the live check | server-enforced (hash comparison in the resolver) — no client leg exists by design; C2 pending                                                                                                                                              |
| AC-SU1 log list + selection                  | verified live: current + rotated/compressed files listed, selection loads raw text (24 kB log rendered)                                                                                                                                     |
| AC-SU2 viewing changes nothing               | structural (two read-only queries; viewer/copy/save are client-local)                                                                                                                                                                       |
| AC-SU3 download vacuums first                | server-side effect of `GET /support/database` — C2 pending                                                                                                                                                                                  |
| AC-SU4 Android-only download gate            | web/desktop build: Download always available (no gate, tooltip repeats the label) — implemented; the Android leg is N/A in this build and untestable here                                                                                   |
| AC-LP1 any user can edit label printer       | `sectionVisibility.test.ts` (Devices visible to non-admin); no permission check on the form; **save verified live** (`success.data-saved`)                                                                                                  |
| AC-LP2 test/save need all four fields        | `devices/labelPrinterForm.test.ts`; verified live (empty address → both disabled, filled → both enabled)                                                                                                                                    |
| AC-LP3 USB preference is device-local        | `labelPrinterForm.test.ts` (built input carries exactly the four wire fields); USB flag lives in `appData.ts` localStorage only                                                                                                             |
| AC-BS1 scanner half is admin-only            | `sectionVisibility.test.ts`; `DevicesSection` gates the rows on `SERVER_ADMIN`                                                                                                                                                              |
| AC-BS2 test scanner records nothing          | `devices/scanner.test.ts` (scan results are locally generated data; the module has no network surface); verified live (scans accumulate, Clear empties)                                                                                     |
| AC-BS3 mock scanner is a testing aid         | `scanner.test.ts` (everything derives from the toggle; off = no scanner); verified live (toggle flips status/connection/list)                                                                                                               |
| AC-CN1 initialise → re-initialise label flip | `configuration/propertySets.test.ts` (configured checks); button labels driven by `nameProperties`                                                                                                                                          |
| AC-CN2 re-initialise idempotent              | `propertySets.test.ts` (deterministic fixed sets — same ids/keys every call); server idempotence is C2 pending                                                                                                                              |
| AC-CN3 key collision rolls back whole batch  | server-side transaction — C2 pending; the input is sent as one array per the contract                                                                                                                                                       |
| AC-CN4 Initialise-Forbidden without a crash  | structural, by D51 design: default `graphqlFetch` inspects `errors` **before** any nested field is read and raises the global Permission-denied modal (`forbiddenError`); the nulled `centralServer.general` is never dereferenced          |
| AC-CN5 supply-levels permission pre-check    | **verified live**: this dev admin lacks `EDIT_CENTRAL_DATA` → `error.no-supply-level-permission` shown inline and the editor never opens, no request                                                                                        |
| AC-CN6 in-use values not removable, no dupes | `propertySets.test.ts` (`supplyLevelsInUse` JSON parsing, trim/dedupe, `addSupplyLevel` duplicate rejection); S4 disables the remove control for in-use values                                                                              |

## Follow-up build — S5 store editor (issue #760)

Added after this report's original scope: `store-editor/` (the footer Edit cell's
modal, [ui-surface § S5](../../../spec/settings/ui-surface.md#s5--store-editor)),
wired from `src/nav/ShellLayout.tsx` through the `onStoreEdit` prop `AppShell`
already carried. Zero locale keys added; `nameId` added to the `UserInfo`
fragment (`UserStoreNode.nameId`) so the facility row is known before the editor
opens — the editor reads/writes the **name** row, and `names(filter: { id: {
equalTo } })` is the only way to fetch one. Behaviours `.28`–`.32` are unit-covered in
`storeEditorLogic.test.ts`; the whole flow (open → pre-filled values → edit →
save → reopen → restore) was driven live against `localhost:8000`.

- **Preferences tab deliberately absent** — the spec captures it at gating level
  only ([README § Status](../../../spec/settings/README.md#status)), so the tab
  group renders Properties alone rather than guessing a 23-field inventory.
- **One departure from the reference client:** its geolocation read is unbounded,
  so a permission prompt the user never answers leaves the GPS block in its
  "fetching" state permanently, coordinates hidden behind it. This build bounds
  the read (30 s), which is also what makes the spec's already-captured
  `error.timeout` reason reachable instead of dead copy. Verified live (the
  automated browser can't answer the prompt — the block recovers and shows the
  timed-out reason).
- **The row-alignment decision below recurred here and has since been made**
  ([D114](../../../spec/DIVERGENCES.md), issue #1032): the store editor's
  definition labels vary widely in length ("Facility Type" vs "Supply Interval
  (Months between deliveries)"), and `FieldRow`'s per-row grid left the controls
  ragged. The editor is now the shared sectioned edit form at the prose measure
  — label above each control in one column, coordinates as read-only labelled
  values — so no label column has to fit names that are data.

## Follow-up build — USB label-print route (issue #257)

The Devices toggle existed and was remembered, but nothing read it: every label
print went over the network regardless. It now **selects the delivery route**
for every label print in the app, which makes this vertical the owner of a
mechanism other verticals consume.

The route and its outcomes live in a new shared domain module,
`src/domain/labelPrinter/` — `printLabels(endpoint, payload)` takes a
consuming vertical's own endpoint and payload and returns one of four outcomes
(`printed` · `not-configured` · `no-usb-printer` · `failed` + detail), and
`LabelPrintOutcomeDialog` is the single surface that says what an attempt that
did not print means. A consuming screen decides only **what** is printed and
**when**, and where its report lands — never what it says
([rules § Devices — label printer](../../../spec/settings/rules.md#devices--label-printer)).
In this vertical the only code change is `DevicesSection` hiding the toggle on
Android (`showPrintViaUsbRow`).

**The USB transport is ours, not the vendor's.** The local print service is
driven over plain HTTP on loopback (two requests: `/available`, then `/write`)
rather than by vendoring Zebra's `BrowserPrint` library, which the current app
ships as a 7.7 kB minified script in `public/`, loaded by a `<script>` tag in
`index.html` and reached through a `window.BrowserPrint` global. What it buys
over two `fetch` calls is a callback-style device wrapper; what it costs is an
un-typed, un-versioned global on every page load and a vendored file no one
here can patch. The e2e differential now evidences the two are
indistinguishable at the wire — the delivery test asserts the device selected,
the pinned API level and the ZPL payload, and passes **unchanged against both
front ends**.

### Behaviour coverage

| Behaviour                                                  | Where                                                                                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.8` USB ignores the stored network settings               | `printLabels.test.ts` (USB route reads no settings) · e2e `prescriptions-regression` (network printer listed first, passed over)                                              |
| `.41` Print via USB absent on Android                      | `sectionVisibility.test.ts`                                                                                                                                                   |
| `.42` service listed nothing attached → told               | `printLabels.test.ts` · `LabelPrintOutcomeDialog.test.ts` · e2e `settings-regression`                                                                                         |
| `.43` nothing configured → refused, nothing sent           | `LabelPrintOutcomeDialog.test.ts` · e2e `settings-regression` (the message, on both front ends, and that nothing is sent)                                                     |
| `.44` service unreachable → failed, not "attach a printer" | `printLabels.test.ts` (transport failure and an unreadable listing) · e2e `settings-regression` (loopback aborted; the no-USB-printer wording asserted _absent_)              |
| `DIS-03.47` network route delivers when configured         | e2e `settings-regression` › `Mutating` (POSTs the payload, USB service untouched; delivery response stubbed) — the other route of the same anchor the USB delivery test cites |
| `.22` the preference never travels                         | `labelPrinterForm.test.ts` (the built input is exactly the four network fields) + `appData.ts` (localStorage only)                                                            |
| four outcomes stated once                                  | `LabelPrintOutcomeDialog.test.ts`                                                                                                                                             |

The e2e rows stub the local print service at its loopback origin, and the
network route's delivery response, in `e2e/helpers/labelPrinter.ts` — they
assert **which route was taken, which device was selected and what was handed
over**, never that paper appears. Each is mutation-checked — breaking the
`connection === 'usb'` match reddens `.42`, removing the not-configured gate
reddens `.43`, and swallowing the network route's non-2xx reddens both of the
prescriptions suite's `.71` tests.

**`.22` stays out of the e2e suite, for a corrected reason.** The header had it
as "needs a second device", which isn't true — a second browser context is one.
But the fact that matters is that the preference is never on the wire, and that
is already pinned at the unit layer (`labelPrinterForm.test.ts` + `appData.ts`).
Driving a second context to watch the consequence duplicates a logic assertion
through the browser, which AUTHORING rules out; it was written that way and
removed.

**Manual, with hardware:** a label was physically printed over USB, with the
local print service installed and a printer attached — the leg no hermetic run
can cover ([`OMS-REG-SET-05` Preconditions](<../../../spec/settings/cases/OMS-REG-SET-05 - Validate Devices Settings.md>)).

- **Spec corrected, not just flagged:** `/write`'s `device.version` is the API
  level **the caller speaks**, not the device's — echo back the level
  `/available` advertises (observed: 5) instead of the `2` the vendor's client
  pins and the service accepts the job, answers `{}` with a `200`, and prints
  nothing. The contract said `device` was "the entry from `available`", which is
  precisely the wrong instruction; it now spells out the constructed shape and
  carries the trap
  ([contract § Devices — label printer](../../../spec/settings/contract.md#devices--label-printer)).
  This build pins 2 and the e2e asserts it, so a regeneration reproduces it.
- **"No USB printer found" cannot cover a print service that is not running.**
  The contract called the two indistinguishable; they are not — a rejected
  fetch versus a `200` with an empty list — and the fix differs: start the
  service, versus attach a printer. The reference app draws the same line.
  Rules, contract and `.44` now state it.
- **A settings read that failed is not "no printer configured".** The outcome
  set read as if every non-success from `labelPrinterSettings` meant nothing was
  stored; the reference app treats only `=== null` that way, and a failed read
  falls through for the endpoint to answer. A non-background read also raised
  the global unexpected-error modal over the print's own outcome. Now
  `background`, and only `null` refuses; the contract's wire trap states it.
- **A departure from the reference client:** `printLabels` ignores the stored
  USB preference on Android. The reference reads it unguarded and is safe
  because its toggle never rendered there; this app's 3.1 did render it, so a
  tablet can carry a flag 3.2 hides the row to undo. Nothing can set it on
  Android from 3.2 on, so it guards no future state — but the stored value
  outlives every upgrade, so the term is permanent. Unit-covered in
  `printLabels.test.ts`; no behaviour minted, since `.41` already implies it.
- **`127.0.0.1`, not `localhost`** — the service binds IPv4 and `localhost` can
  resolve to `::1`. Loopback is a trustworthy origin, so plain HTTP is reachable
  from an HTTPS page without mixed-content blocking.
- **No new locale keys** — every outcome reuses an existing catalogue key
  (`error.label-printer-not-configured`, `error.no-usb-printer-found`,
  `error.printing-label`, `heading.unable-to-print`).
- **Unchanged and still true:** the USB preference remains device-local and is
  never part of `LabelPrinterSettingsInput` (AC-LP3 above) — which is `.22`,
  covered at the unit layer as noted above.

## Styling pass (vs. the reference app at runtime)

Compared side-by-side against the running reference open-mSupply settings page and aligned within this app's own tokens/components: the section stack width-capped at `--measure-form` and **start-aligned** like the reference column (plain section CSS — deliberately not `ContentContainer`, whose centring the reference layout doesn't have and which no other in-tree screen uses); section headings given a leading intent icon (`SunIcon` added to `src/ui/icons`, the others existing) with the accordion's own neutral trigger treatment — the reference's accent-coloured headings deliberately not copied (component appearance is the library's; a consumer class override was tried and backed out); the Synchronisation form converted from stacked labelled inputs to `FieldRow` rows — which is also what ui-surface § Layout mandates; form action clusters (Test/Save, Save) inline-end aligned. A follow-up composition audit against `src/ui/docs/PAGES.md` + `kdd/form-layout` then replaced hand-rolled pieces with the defined vocabulary: sub-groups (Devices' two halves, S2's three groups) are now `FormSection` titled field groups — **neutral** headings per the library's own rule, deliberately not the reference's accent colour; the heading outline is corrected (breadcrumb h1 → `AccordionTrigger as="h2"` → `FormSection` h3); and S3's log viewer is a `readonly TextArea` (the registry's multi-line role, which ui-surface cites) instead of a bespoke `<pre>` — a C3 fix. Deliberately NOT copied: the reference's bordered card surface around the section list (our flat hairline-divider accordion is the library's established look), its right-flushed input column (FieldRow's grid geometry is the library's), and MUI colour values (tokens only).

**Fed back into the spec so a rebuild reproduces it** (`spec/settings/ui-surface.md` + the registry): the S1 sections table gained a heading-icon (intent) column and an accent-emphasis note; the S1 Layout now states the width-capped **start-aligned** (not centred) stack, the toggle-row no-wrapper rule, accent sub-group headings, and inline-end action clusters; S2's Layout states the same cap; and `ui-standards/components.md` § Layout now documents the previously-unregistered **Centred content measure → `ContentContainer`** role (noting a start-aligned cap like settings' is vertical-owned layout, not that role).

## Verification beyond unit tests

Full in-browser pass against the running dev server (`localhost:8000` backend, admin on a central-server datafile): all five sections render in fixed order, single-open accordion confirmed (opening one closes the other), breadcrumbs/version chrome intact, S2 routed page with back-link breadcrumb, S3 modal lists and loads real logs, zero console errors/warnings. `pnpm check`'s theme/page-CSS guards pass with the section's one module stylesheet (layout-only, token values).

## Flags

- **⚠️ VERIFY status (three of the four resolved in a follow-up source pass; spec updated in place on this branch):**
  - `PRINT_LABEL_TEST` endpoint — **resolved**: `POST /print/label-test` → `test_printer` (`open-msupply/server/server/src/print/mod.rs`), `{ is_valid }` on 200, 500 + text on failure, **no auth, no body — it probes the STORED settings, not the form's**. Spec corrected (rules/contract § Devices — label printer) and the no-auth gap recorded beside `/support/vacuum`'s.
  - Mock scanner enabling the Test-scanner controls — **resolved**: reference source confirms `isEnabled = availableScanners.length > 0` with the mock in that set; this build's behaviour matches. Also surfaced that the reference **persists** the toggle per device — spec now states it, and this build persists it via `appData.ts`.
  - Supply-level "in use" backing query — implemented as `names(filter: { isStore: true })` reading the `properties` JSON; **now named in contract § Configuration** (source-traced from the reference client's `useSupplyLevelsInUse`), with a residual VERIFY that it hasn't been confirmed against a running server.
  - Wrong-shape-but-valid-JSON theme recovery — unimplemented/untested either side; parse-only validation as specced (moot until the "effective theme" question below is decided).
- **Password visibility toggle:** the sync password now uses the shared `PasswordField` — a `TextField` variant with a show/hide eye toggle (`sync-settings-password-visibility`), matching login/initialisation. Toast correctly avoided — all outcomes are inline `Alert`s per controls › action feedback.
- **Decisions the spec should own (refinement candidates):**
  - Field alignment in settings rows: the reference app end-aligns each row's control at the section's inline end (controls column-align at the right edge); `FieldRow` places the control directly after its label, so sibling rows' controls don't align (label widths differ). Whether the settings rows should match the reference's end-alignment is a spec/registry decision — it would need a sanctioned `FieldRow` capability (or a different mapped role) first; deliberately not improvised by this build (an `alignControl` prop was prototyped and reverted as out of scope).
  - Theme editor's pre-fill when nothing is saved — **resolved as [D52](../../../spec/DIVERGENCES.md)**: the editor seeds an empty JSON object (this app has no built-in theme document); rules § Display settings now states it. What a custom theme _does_ in this implementation remains the open theming question. Label-printer unconfigured defaults (blank address / 9100 / 290 / 576) are also now stated in rules § Devices — label printer.
  - `databaseSettings` (`databaseType`) — **resolved**: reference source shows it consumed only by the Android/native download path (SQLite → vacuum-then-native-read); contract § Support now scopes it there, so this web build's non-use is per spec.
  - Clear encoding — **resolved**: contract § Display settings now states clearing sends the field as `""` (no null sentinel / dedicated operation), matching both the reference client and this build.
  - ~~The GAPS/forecasting property sets are only named generically~~ — **resolved**: tabulated record-for-record in [`spec/settings/property-sets.md`](../../../spec/settings/property-sets.md) (ids, keys, en/fr seeded names/values, the configured-check key sets), referenced from rules/contract § Configuration; the ids are upsert identities so a rebuild must send them verbatim.
- **C2 tooling:** unchanged — no CI harness for real-backend AC legs; rows above marked "C2 pending". This build's live-verified rows (AC-SY3, AC-CN5, AC-LP1/LP2, AC-DS2, AC-SU1) were exercised manually against the dev server, not in CI.
- **C7 note:** the live dev server's schema is slightly newer than the pinned `spec/schema.graphql` (`customFields` on invoice update, `dynamicFilter` on invoice filter — both surfaced during codegen in out-of-scope generated files, reverted here). The pinned schema wants a wholesale refresh in its own pass.
- **Cross-vertical reuse:** `SyncSection` maps failure variants through `src/sections/sync-modal/syncErrors.ts` (precedent: `src/initialisation/` imports the same module). Candidate for promotion to `src/domain/` if a third consumer appears.
- **Electron/Android variants:** the Electron-only scanner rows (USB serial/keyboard type, detect action) and the Android native download path are omitted — this is the web/desktop build; noted in the spec's own README as unprobed.
