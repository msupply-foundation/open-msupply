# Build report — plugin-management

**Target stack:** SolidJS + Vite, composed from the shared component library in `src/ui/`, with roles resolved through `spec/ui-standards/components.md`. Built from `spec/plugin-management/` (reverse spec, `AC-*` anchors; not yet reconciled into cases). Route `manage/plugins`, registered in `sectionRoutes` (`src/App.tsx`).

## What was built

- **S1 Installed plugins** (`PluginsList.tsx`): one read with no paging. Sort is held in the URL and applied client-side (`pluginRows.ts`). Rows are keyed `<KIND>:<id>`, the leading selection feeds a bulk Delete, and only configurable rows open on click.
- **S2 Upload dialog** (`UploadPluginDialog.tsx`, `bundleFile.ts`): one `.json` file (any case), refused over 50 MB before sending, and a multi-file drop chooses none. Then `POST /upload` → `installUploadedPlugin`, blocking until the outcome; refusals show inline with the raw detail behind a disclosure.
- **S3 Configure dialog** (`ConfigurePluginDialog.tsx`, `configuration.ts`): the plugin's own editor at `size="full"`, mounted through the host's `PluginSlotOutlet`, so it is error-isolated and never remounts on a draft change. It seeds once from the store-less record or the plugin's default. Save inserts or updates the whole value with no `input.storeId`, and a refused save keeps the edits.
- **S4 Uninstall confirmation** (`UninstallPluginsAction.tsx`, `uninstall.ts`): each selected row is uninstalled on its own, one after another. All done → close; any refused → a summary naming each refused plugin, and Close clears the selection.
- **SDK — the configuration contribution** (spec/plugins/sdk-contract § the configuration contribution): `PluginConfiguration` / `ConfigurationEditorProps` on `PluginDefinition` (additive, no API bump), a validator branch (`src/plugins/validate.ts`) and the registry accessor `configurationFor(code)`.
- **The reference plugin** `plugins/examples/hello_world` gained a one-field settings editor (a greeting) and a dashboard stat that reads the saved record. It is the `solid` editor the screen, and the e2e suite after it, need.
- **Shared library:** DataTable / TableRow / CardView gained an opt-in `rowClickable` predicate (ledger: `src/ui/docs/UI_ELEMENTS.md`).
- **Locale:** `label.runtime` (reference text) and `messages.confirm-delete-plugins_one/_other` (new copy).
- **Config:** `UPLOAD_URL` (`/upload`, already proxied in dev).

## Anchor coverage

| Anchor                                        | Test                                                |
| --------------------------------------------- | --------------------------------------------------- |
| AC-L2, L3, L4, L5, L6, L7, L10                | `pluginRows.test.ts`                                |
| AC-I2, I3, I14, I15; AC-A4 (client side)      | `bundleFile.test.ts`                                |
| AC-I17 (orders an unreadable version)         | `pluginRows.test.ts`                                |
| AC-C4, C5, C6, C7, C10                        | `configuration.test.ts`                             |
| AC-U4, U5                                     | `uninstall.test.ts`                                 |
| AC-C1, AC-C3 (what makes a code configurable) | `src/plugins/registry.test.ts` › `configurationFor` |
| — (a malformed configuration is refused)      | `src/plugins/validate.test.ts` › configuration      |

**Owned by the e2e suite (next step), each verified by hand against the real backend during this build:**

- **Screen behaviour:** AC-L1 (empty state), AC-L9 (inert row), AC-I1, AC-I5, AC-I6, AC-U1–U3, AC-C2, AC-C8, AC-C9, AC-C11 (the dashboard greeting reads the saved setting).
- **Server-side outcomes:** AC-L8, AC-I7–I13, AC-I16, AC-U6, AC-U7, AC-F1, AC-F2.

**Wire/server-only:** AC-A1, A2, A3, A5, A6. These are refusals the screen never reaches, because the destination gate keeps it central-only and admin-only. They were confirmed on the wire while writing the spec (contract.md); the e2e suite can assert them with direct GraphQL.

**C2 real-backend leg:** no CI tooling yet. Every surface was driven headless against a central-pinned `develop` server (`:8186`, a copy of the e2e datafile) through vite `:3201`:

- The list, and both upload refusals.
- A real install of the built `hello_world` bundle, then configure → save → dashboard greeting.
- Escape, a refused save (route-intercepted), and an unreadable record.
- One and several uninstalls, and a partial refusal.
- The empty state, a failed read, and phone width (card view, no horizontal scroll).

## Flags and candidate spec refinements

1. **A failed list read has no table error state.** `ui-surface` S1 says "the table's standard error state", but `DataTable` has none: the read fails into the global unexpected-error modal, as every list does. The spec should say that.
2. **The shared-id trap is detectable.** `uninstallPlugin` answers the removed row's `kind`. A frontend row selected under an id it shares with a backend row comes back `BACKEND`, so the client could report "removed the backend plugin instead". The spec records the trap as-is, so nothing here acts on it. It is a candidate refinement.
3. **The new confirm key carries plural forms.** `messages.confirm-delete-plugins` was minted as `_one`/`_other`, the catalog's plural convention. `_one` never shows, because one selection uses the reference `messages.confirm-delete-plugin`.
4. **Install refusals are multi-line dumps.** So the banner shows "Unable to install plugin" with the parser's text behind **More information** (`rejectionFrom` + `ErrorDetails`, per controls › action feedback). The spec says "the server's description"; it might say "behind the details disclosure" where the description is a dump.
5. **Dev loading makes an editor available at once.** With `OMS_PLUGIN_DIRS`, a plugin loaded from source has its editor registered before its bundle is installed. So in dev an in-session install is configurable without a reload. Production behaves as AC-C3 states.

## Follow-ups

- `/reconcile-behaviours` (mint the case — no tmf-testing case exists), then the e2e suite: it needs the built `hello_world` bundle installed through the screen as its fixture.
- Four server defects reachable from this screen are listed in `spec/plugin-management/README.md` › server defects; none is fixed here.
