# Build report — plugin-management

**Target stack:** SolidJS + Vite, composed from the shared component library in `src/ui/`, with roles resolved through `spec/ui-standards/components.md`. Built from `spec/plugin-management/` (reverse spec), anchored to the behaviours of its case `OMS-REG-MNG-07` (written `.n` below; the retired `AC-*` mapping is `spec/plugin-management/acceptance.md`). Route `manage/plugins`, registered in `sectionRoutes` (`src/App.tsx`).

## What was built

- **S1 Installed plugins** (`PluginsList.tsx`): one read with no paging, read through `gated`. Sort is held in the URL and applied client-side through the shared `list/sortRows` with a version comparator (`pluginRows.ts`). Rows are keyed `<KIND>:<id>`, the leading selection feeds the table's own bulk-action bar (`selectionActions`), only configurable rows open on click, and **Upload plugin** answers Alt+N.
- **S2 Upload dialog** (`UploadPluginDialog.tsx`, `bundleFile.ts`): one `.json` file (any case), refused over 50 MB before sending, and a multi-file drop chooses none. The pick is decided whole through the upload zone's `onPick`. Then `POST /upload` (the shared `api/postFiles`) → `installUploadedPlugin`, blocking until the outcome; refusals show inline with the raw detail behind a disclosure, and a signed-out upload opens the re-login modal.
- **S3 Configure dialog** (`ConfigurePluginDialog.tsx`, `configuration.ts`): the plugin's own editor at `size="full"`, mounted through the host's `PluginSlotOutlet`, so it is error-isolated and never remounts on a draft change. It seeds once from the store-less record or the plugin's default, read and written through the SDK's own plugin-data operations. Save inserts or updates the whole value with no `input.storeId`, a refused save keeps the edits, and a failed editor withholds Save.
- **S4 Uninstall confirmation** (the shared bulk delete, `src/domain/selection/DeleteSelectedAction.tsx`, lifted out of the asset catalogue for this): each selected row is uninstalled on its own, one after another (`batchSize={1}`). All done → close; any refused → the outcome heading and a summary naming each refused plugin, and Close clears the selection. A frontend row whose uninstall removed the backend row of the same id is a refusal (`uninstallOutcome`).
- **SDK — the configuration contribution** (spec/plugins/sdk-contract § the configuration contribution): `PluginConfiguration` / `ConfigurationEditorProps` on `PluginDefinition` (additive, no API bump), a validator branch (`src/plugins/validate.ts`) and the registry accessor `configurationFor(code)`.
- **The reference plugin** `plugins/examples/hello_world` gained a one-field settings editor (a greeting) and a dashboard stat that reads the saved record. It is the `solid` editor the screen, and the e2e suite after it, need.
- **Shared library:** DataTable / TableRow / CardView gained an opt-in `rowClickable` predicate; `PluginSlotOutlet` an optional `onError`; `UploadZone` an optional combined `onPick` (ledger: `src/ui/docs/UI_ELEMENTS.md`).
- **Shared helpers:** `list/sortRows` takes an optional comparator; `api/postFiles` is the one multipart upload, now used by the sync files and the fridge-tag import too.
- **Locale:** `label.runtime` (reference text), and `messages.confirm-delete-plugins_one/_other` and `error.plugin-shared-id-backend-removed` (new copy).
- **Config:** `UPLOAD_URL` (`/upload`, already proxied in dev).

## Anchor coverage

| Behaviours (`OMS-REG-MNG-07.n`)                        | Test                                                |
| ------------------------------------------------------ | --------------------------------------------------- |
| `.10`, `.11`, `.12`, `.13`, `.15`, `.16`, `.20`, `.40` | `pluginRows.test.ts`                                |
| `.65` (the shared-id uninstall reads as a refusal)     | `pluginRows.test.ts` › `uninstallOutcome`           |
| `.4` (client side), `.22`, `.24`, `.37`, `.38`, `.64`  | `bundleFile.test.ts`                                |
| `.54`, `.55`, `.56`, `.57`, `.58`, `.61`               | `configuration.test.ts`                             |
| — (rows sharing an id are uninstalled one at a time)   | `src/domain/selection/writeOutcome.test.ts`         |
| `.49`, `.50`, `.52` (what makes a code configurable)   | `src/plugins/registry.test.ts` › `configurationFor` |
| — (a malformed configuration is refused)               | `src/plugins/validate.test.ts` › configuration      |
| `.63` (the outlet reports a failed editor)             | `src/ui/elements/plugins/PluginSlotOutlet.test.tsx` |

**Owned by the e2e suite** (`e2e/specs/plugin-management-regression.spec.ts`, green against the real backend; its header lists the anchors it leaves out and why):

- **Screen behaviour:** `.8`, `.9`, `.14`, `.17`, `.19`, `.21`, `.23`, `.25`–`.28`, `.35`, `.36`, `.41`–`.46`, `.51`, `.53`, `.59`, `.60`, `.62`–`.65`.
- **Server-side outcomes:** `.18`, `.29`–`.34`, `.39`, `.47`, `.48`, and the case's Flows.

**Wire/server-only:** `.1`–`.3`, `.5`, `.6`; `.7` is navigation's gate. These are refusals the screen never reaches, because the destination gate keeps it central-only and admin-only. They were confirmed on the wire while writing the spec (contract.md); the e2e suite can assert them with direct GraphQL.

**C2 real-backend leg:** no CI tooling yet. Every surface was driven headless against a central-pinned `develop` server (`:8186`, a copy of the e2e datafile) through vite `:3201`:

- The list, and both upload refusals.
- A real install of the built `hello_world` bundle, then configure → save → dashboard greeting.
- Escape, a refused save (route-intercepted), and an unreadable record.
- One and several uninstalls, and a partial refusal.
- The empty state, a failed read, and phone width (card view, no horizontal scroll).

## Flags and candidate spec refinements

1. ~~**A failed list read has no table error state.**~~ Resolved: the spec now says the read fails into the global unexpected-error modal, as every list's does.
2. ~~**The shared-id trap is detectable.**~~ Resolved: the screen reads the removed row's `kind` and reports the wrong removal as a refusal (`.65`).
3. **The new confirm key carries plural forms.** `messages.confirm-delete-plugins` was minted as `_one`/`_other`, the catalog's plural convention. `_one` never shows, because one selection uses the reference `messages.confirm-delete-plugin`.
4. **Install refusals are multi-line dumps.** So the banner shows "Unable to install plugin" with the parser's text behind **More information** (`rejectionFrom` + `ErrorDetails`, per controls › action feedback). The spec says "the server's description"; it might say "behind the details disclosure" where the description is a dump.
5. **Dev loading makes an editor available at once.** With `OMS_PLUGIN_DIRS`, a plugin loaded from source has its editor registered before its bundle is installed. So in dev an in-session install is configurable without a reload. Production behaves as AC-C3 states.

## Follow-ups

- Four server defects reachable from this screen are listed in `spec/plugin-management/README.md` › server defects; none is fixed here.
