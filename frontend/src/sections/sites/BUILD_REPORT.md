# Sites — build report

**Target stack:** SolidJS + Vite, with the shared component library in [`src/ui/`](../../ui/) resolved through the roles in [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md). Built from [`spec/sites/`](../../../spec/sites/) per [`spec/IMPLEMENTING.md`](../../../spec/IMPLEMENTING.md) (C1–C4, C7, C8 in force).

One screen (`manage/sites`, S1) and one modal (S2). No per-site route — the register is the whole read surface, and creating, editing, deleting, assigning stores and breaking a pairing all happen in the modal a row click opens.

## Live verification

Beyond the colocated tests, the built screen was driven against the **live central (non-standalone) server** at `:8890` (dev server proxied to it, then stopped), and every one of the ten generated operations was fired against it directly.

Confirmed on the running implementation: the register's seven columns in spec order, name-ascending default with the sort control on Code and Name only, the app-bar name search narrowing case-insensitively (`S2` → `s2`, total `1–1 of 1`), the filtered-to-nothing empty state ("Nothing here" / "There are no sites to display", **no** create affordance), a URL round-trip restoring search + code-descending sort + page size after a reload, blank cells for a never-paired site, the read-only editor on a mixed central (Code/Name disabled-with-value, **no** password row, no Save, Cancel alone), the pairing rows present on a V7 non-own site and **absent** on the server's own site, the multi-device switch disabled with its feature-flag tooltip rendering the newly-added key, and the clear-hardware-id confirmation copy. Wire-level: all three standalone refusals (`Forbidden` / "Only available on standalone central servers"), `SameSite`, `SiteIsNotV7` and `SiteDoesNotExist`.

**Deliberately not fired:** the success paths of `clearSiteHardwareId` / `clearSiteToken` — unpairing a site another checkout is actively syncing, which the spec itself refused to do. No probe residue: every write fired was a refusal, which commits nothing.

## Anchor coverage

Anchors are the behaviours of [`spec/sites/cases/OMS-FUN-SYC-002`](../../../spec/sites/cases/OMS-FUN-SYC-002%20-%20Remote%20Site%20Management%20in%20OMS%20Central.md). All paths below are relative to `src/sections/sites/list/`.

| Behaviour                                                      | Test file                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `.1` site details editable                                     | `siteSave.test.ts`                                                       |
| `.2` store associated, reflected                               | `siteSave.test.ts`, `siteEdit.test.ts`                                   |
| `.3` existing association not overridden                       | `siteEdit.test.ts`, `siteSave.test.ts`                                   |
| `.4` clearing hardware id + token re-initialise                | `sitePairing.test.ts` (affordance only — see C2)                         |
| `.5` clearing token forces re-login                            | `sitePairing.test.ts` (affordance only — see C2)                         |
| `.6` the seven register columns                                | `siteColumns.test.ts`                                                    |
| `.7` name-ascending default                                    | `listState.test.ts`                                                      |
| `.8` Code + Name sort, nothing else                            | `siteColumns.test.ts`, `listState.test.ts`                               |
| `.9` search narrows rows and total                             | `listState.test.ts`                                                      |
| `.10` no match → empty state                                   | _exempt — see below_                                                     |
| `.11` URL-carried, reload-stable                               | `listState.test.ts`                                                      |
| `.12` mixed central is read-only                               | `siteGates.test.ts`                                                      |
| `.13` pairing controls stay on a mixed central                 | `siteGates.test.ts`                                                      |
| `.14` remote site: absent + unreadable                         | `src/nav/navGates.test.ts` (menu half); _C2 gap for the read_            |
| `.15` standalone offers create/select/save/delete              | `siteGates.test.ts`                                                      |
| `.16` create refusals name the missing field                   | `siteEdit.test.ts`                                                       |
| `.17` duplicate name refused                                   | `siteEdit.test.ts` (mapping; server check per C2)                        |
| `.18` re-saving an unchanged name accepted                     | `siteEdit.test.ts`                                                       |
| `.19` empty code/password = unchanged                          | `siteEdit.test.ts`                                                       |
| `.20` whitespace-only refused                                  | `siteEdit.test.ts`                                                       |
| `.21` password never displayed                                 | `siteEdit.test.ts`                                                       |
| `.22` a field change preserves pairing state                   | _C2 gap — server invariant; see below_                                   |
| `.23` id shown nowhere, not editable                           | `siteEdit.test.ts`, `siteColumns.test.ts`                                |
| `.24` clears only for a V7 non-own site                        | `sitePairing.test.ts`                                                    |
| `.25` each clear confirms; cancel does nothing                 | _exempt — see below_                                                     |
| `.26` clearing hardware id keeps the token                     | `sitePairing.test.ts` (affordance); _C2 for the outcome_                 |
| `.27` clearing the token keeps the hardware id                 | _C2 gap — see below_                                                     |
| `.28` clear refused on a legacy-flow site                      | `sitePairing.test.ts` (mirrored so unreachable); wire refusal fired live |
| `.29` clear refused on the server's own site                   | `sitePairing.test.ts`; wire refusal fired live                           |
| `.30` multi-device is one-way                                  | `sitePairing.test.ts`                                                    |
| `.31` multi-device inoperable without the flag, and says why   | `sitePairing.test.ts`                                                    |
| `.32` adding a store moves it                                  | `siteEdit.test.ts`                                                       |
| `.33` removing hands it to the central site                    | `siteEdit.test.ts`                                                       |
| `.34` central site offers no removal                           | `siteEdit.test.ts`                                                       |
| `.35` an assignment is all-or-nothing                          | _C2 gap — server transaction; see below_                                 |
| `.36` store-step failure leaves fields committed               | `siteSave.test.ts`                                                       |
| `.37` a site with stores cannot be deleted                     | `deleteSites.test.ts`, `siteEdit.test.ts`                                |
| `.38` moving stores off makes it deletable                     | `siteEdit.test.ts`, `deleteSites.test.ts`                                |
| `.39` the central site cannot be deleted                       | `deleteSites.test.ts`                                                    |
| `.40` bulk delete is per-site and reports each refusal by name | `deleteSites.test.ts`                                                    |

68 tests across 7 files. Nothing is marked `(pending: …)`, `automatable: manual-only` or `needs: hardware` in this case, and nothing here is omitted per DIVERGENCES, so the exemptions below are the only gaps — each named, none silent.

### Exempt (C1), with reason

- **`.10` (empty state) and `.25` (confirmation dialogs)** — both are assertions about a **rendered** surface. Neither vitest project in this repo renders DOM: the `node` project has no document and the `solid` project deliberately runs `environment: 'node'` ("components under test render no DOM" — `vitest.workspace.ts`). Both were **verified on the running implementation** in this build (copy quoted above), and both belong to the sites `e2e/` suite that does not exist yet — the follow-up below. Listed rather than faked with a message-key assertion, which would test `t()`, not the behaviour.

### C2 real-backend gaps

C2's real-backend leg has no CI tooling; these are the anchors whose observable outcome this build could not exercise, all of them gaps the spec already carries:

- **`.4`, `.5`, `.26`, `.27`** — the two clears' success paths. Firing them unpairs a site `:8000` is actively syncing, so only their refusals were fired (live). The stored-field outcome rests on the Rust services' own unit tests.
- **`.15`, `.17`, `.35`, and the whole standalone-gated write half** — `upsertSite`, `deleteSite` and `assignStoresToSite` are refused `Forbidden` on the only central server available (central, **not** standalone). The refusals were fired live; the success paths, the duplicate-name check and the all-or-nothing store transaction are source-verified only. The create modal, the password field, the store picker, the per-store remove, the bulk-delete footer and the row-selection column were therefore **never seen rendered** — only their read-only counterparts were.
- **`.14` (read half)** — the `centralServer` namespace refusing a remote site was confirmed at wire level during the spec stage against `:8000`; not re-fired here.
- **`.22`** — that a name/code/password change preserves the hardware id, token, multi-device flag and every sync timestamp is a **server** invariant (the upsert rebuilds the row carrying them). The client's whole part is sending only `id`/`name`/`code`/`password`, which `siteEdit.test.ts` pins; the preservation itself needs a standalone central.
- **Permission denial** — probed as an all-permission user only. The `EditCentralData` gate on the read and every mutation is read from the authorisation map, not observed refusing.

## Flags

### Roles hit that are ⛔ not built

- **Free-text search / filter (⛔)** — S1's one filter sits in the app bar, always present, not an addable chip, so `FilterBar` (the built role) does not cover it. Rather than hand-roll an input (a bespoke look-alike, C3), the screen composes the library's **own exported `FilterTextInput`** — the debounced server-bound search control `FilterBar` puts inside its chips — into a `Toolbar`. It carries the search icon, the `aria-label`, the 300 ms trailing debounce and the Enter/blur flush already. **Candidate registry edit:** flip that row from ⛔ to 🔶 _by composition_ naming `FilterTextInput` + `Toolbar`, or extract a `SearchField` for it. It is the second consumer's decision; this build did not add a component.
- **Toast (⛔ reserved)** — see the divergence below.

### DIVERGENCES honoured

- **[D21] / [D22] over the spec's toasts.** `ui-surface.md` S2/S3 describe an error toast for a save rejection, a delete rejection from the editor, and a success toast (`messages.site-saved`, `messages.deleted-sites`). The toast role is ⛔ **reserved** and MUST NOT carry a user-initiated action's outcome, and `ui-standards/controls.md` § action feedback + dialogs fix the alternative. So: a save rejection is an **inline `Alert` inside the editor** with the input preserved (plus `ErrorDetails` for the store step's raw message), success is **the dialog closing and the register re-reading**, and a bulk delete's refusals are the **blocking report dialog** S1 already specifies (which does use `messages.deleted-sites` for its partial count). Same precedent as the stock-movements build and the locations vertical.
  - **Consequence to note:** `messages.site-saved` is now referenced by nothing. It stays in the catalogue (it is not this build's to remove) but the spec sentence that names it has no surface in this app.
- **[D55]** dialog footer identity — `CancelButton` / `DialogSaveButton`, icon-less, Delete in the danger tone on the actions row's inline start.

### Decisions the spec should make (candidate refinements)

1. **The success-feedback sentence in `ui-surface.md` S3** still reads as a toast. It should be restated as D21 does, or `messages.site-saved` marked as current-app-only — otherwise every future reader re-litigates it.
2. **No date-and-time cell preset.** S1's Last Connection / Last Sync are one "date & time" column each, but the shared helpers offer only `date` and `time` (and the house shape for a log table is the two side by side — a documented review finding elsewhere). Splitting them would make nine columns with labels the spec doesn't name, so each column spreads the `datetime` preset and overrides only its renderer with the shared `localisedDateTime`. **A `dateTime` cell kind in `_globalColumnConfig.ts` would remove the exception.**
3. **"Non-dismissable by backdrop click" is not expressible.** `Dialog` has one `dismissable` flag covering the scrim **and** Escape, and swallowing Escape would break the accessibility baseline. The editor therefore follows the peer verticals (`dismissable={!saving()}`). Either the spec should accept scrim dismissal for this modal, or `Dialog` needs a separate scrim option.
4. **"A detail container holding a single vertical stack"** (S2 § layout) is implemented as the dialog's own `width="form"` measure, not a `DetailContainer` inside it: the `Dialog` contract forbids narrowing a measure-sized dialog by capping its content (the frame and its title/actions rows would stay wide around a floating body). Same width cap, the right owner — worth saying in the spec so it isn't read as a miss.
5. **Two copy slots have no cited key.** The store picker's own label (used `label.store`) and the existing-site password field's "already set, leave blank to keep" placeholder (rendered as a literal `••••••••` mask, which is not translatable copy). Both should be named in `ui-surface.md` or explicitly left to the implementation.
6. **The breadcrumb is two crumbs** ("Manage / Sites") because S1's Layout says so; every sibling list vertical renders one. Fine either way, but the two habits should be reconciled once.

### Shared-file edits outside the vertical

- **`codegen/plugin.cjs`** — added `JSONObject: "unknown"` to `SCALAR_MAP`. `Query.featureFlags` is a `JSONObject`, and without the entry it fell through to the "unknown scalar → string" default, which is not merely imprecise but **wrong**: it would have let this vertical read a feature flag off a value that is really an object. Narrowed at the vertical's boundary with a type predicate, not a cast (`sitePairing.isFlagMap`). One knock-on in a shared generated file: `src/api/tableConfig.generated.ts`'s unused `customTranslations` input field is now `unknown | null` instead of `string | null`. No consumer sets it; `pnpm check` is green.
- **`src/App.tsx`** — one import and one `sectionRoutes` entry (`'manage/sites'`). Additive; nothing else touched. The destination itself already existed in `src/nav/navConfig.ts` with its `centralAdmin` gate, so **no nav change was needed**.
- **`src/intl/locales/en/common.json`** — added `messages.multi-device-requires-flag`, the one key the spec flags as missing from this repo's ported catalogue, with the current app's own wording. English only; `fr/` and `ar/` untouched, per the house rule. `messages.confirm-delete-sites` and `messages.deleted-sites` turned out to be **present** already (as their `_one`/`_other` plural forms) — the spec's dictionary-gap note is accurate about exactly one key.

## Follow-ups

- **A sites `e2e/` suite, and a Sites section in [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md).** There is neither today, so the ids this screen places (`new-site-button`, `site-edit-modal`, `site-code-input`, `site-name-input`, `site-password-input`, `site-sync-version`, `site-hardware-id`, `clear-hardware-id-button`, `clear-sync-token-button`, `multi-device-switch`, `multi-device-reason`, `site-store-search-input`, `site-store-remove`, `site-stores-section`, `site-save-error`, `site-delete-button`, `site-delete-refused`; plus the shared `confirmation-modal`, `dialog-button-*`, `nothing-here`, `actions-footer`, `selected-rows-count`, `delete-lines-button`, `filter-input-name`, `item-option-code`/`-name` and the table's own `header-*`/`cell-*` over the column keys) follow the file's conventions but are not yet in its registry. The suite is what would lift `.10` and `.25` out of exemption.
- **The standalone-central write half needs a standalone central to verify** — the same environment gap the spec carries. Until one exists, the create modal, password field, store picker, per-store remove, bulk-delete footer and selection column are built-but-unseen.
- **Blocked on no shared component.** Every role this vertical needed is built or composable from built ones; the two ⛔ rows above are a registry-wording question, not a missing component.
- **Upstream, unchanged by this build:** the site-password hashing mismatch on a standalone central (a `contract.md` wire trap, deliberately not filed pending James's call), the absent audit trail, and the client-proposed create id that can silently overwrite another site. All three are captured as-is in the spec and implemented as captured — `proposedSiteId` carries the collision risk in a comment and a test rather than being quietly "fixed", because making it safe is a design decision, not a build one.

## Gates

| Gate         | Result                                             |
| ------------ | -------------------------------------------------- |
| `pnpm check` | 🟢 green                                           |
| `pnpm test`  | 🟢 green — 147 files, 1456 tests                   |
| `pnpm build` | 🟢 green — `SitesList` chunk 22.5 kB (6.6 kB gzip) |
