# Build report — help

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Scoped build of the help vertical (`spec/help`), stacked on the help reverse-spec (PR #440); S1 first, then the central-only S2/S3 management + upload follow-up. Gates green repo-wide: `pnpm check` ✓ · `pnpm test` ✓ · `pnpm build` ✓. GraphQL generated against `:8890` (`develop`, central) via the scoped codegen runner (`:8000` is the remote / `PRE_INITIALISATION`).

## Built — S1 Help page (universal)

- User-guide **external link** (localised es/fr(+fr-DJ)/pt, else default — `.17`); keyboard-shortcuts static text; **help-documents** list (showable-only, newest-first, external file links — `.18`/`.19`/`.20`); **contact form** (Feedback/Support · email · message; async Send gated by `canSendContactForm`; inline email note; outcome `Alert`; `insertContactForm` via `returnGraphqlErrors`; reset on success — `.2`-`.9`, `.23`, `.25`, `.26`). The `help` route already existed — the stub component was swapped, no `App.tsx` change.
- Pure-logic core (`helpLogic.ts`) + 5 behaviour-citing tests.

## Behaviour coverage (`OMS-REG-HLP-01.*` — [case](../../../spec/help/cases/OMS-REG-HLP-01%20-%20Validate%20Help%20Page%20and%20Contact%20Form.md))

| Behaviour                                                    | Where                                                                       | Status                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.17` user-guide localised URL                               | `helpLogic.test.ts`                                                         | ✅ tested                                                                                             |
| `.18`/`.19` documents block skips fileless / hides empty     | `helpLogic.test.ts`                                                         | ✅ tested                                                                                             |
| `.20` file-view URL                                          | `helpLogic.test.ts`                                                         | ✅ tested                                                                                             |
| `.2`-`.7` send-gating; `.23` email format                    | `helpLogic.test.ts`                                                         | ✅ tested                                                                                             |
| `.15` universal ordered page; `.25`/`.26` outcome+reset      | `HelpPage.tsx`                                                              | ⚠️ built, not unit-tested (UI-level)                                                                  |
| `.24` server guard; `.21` view-session; `.22` not-synced 404 | —                                                                           | ❌ server/HTTP — re-verified live on `develop` during the reverse spec (#440), not unit-testable here |
| `.29`/`.30` title required + trim; `.33` list sort           | `helpDocumentsLogic.test.ts`                                                | ✅ tested                                                                                             |
| `.28` central-only nav+guard; `.31`/`.32`/`.34`/`.35` mgmt   | `HelpDocumentsManagement.tsx` / `UploadHelpDocumentModal.tsx` / `index.tsx` | ⚠️ built, not unit-tested (UI/wire-level)                                                             |
| `.36`/`.37` distribution                                     | —                                                                           | ❌ sync-level (central → remote after sync); not FE-testable                                          |

## Built — S2 management + S3 upload (central-only)

- **S2 management** (`HelpDocumentsManagement.tsx`) at `manage/help-documents`: server-wide list (no store scope), newest-first, client-side Title sort, selection; columns Title / Filename (link, **empty** for a fileless record) / Uploaded; empty state `error.no-help-documents`; selection footer — Download (sequential per file) · Delete (confirmation stating the count, per-document independent — `.34`) · Clear (`.33`).
- **S3 upload** (`UploadHelpDocumentModal.tsx`): title (required, trimmed) then a single-file dropzone that starts the two-step publish immediately — `insertHelpDocument` (record) then `uploadSyncFiles('help_document', …)` (file). Empty-title client refusal (`.29`/`.30`); duplicate / central / oversize rejections shown in-dialog (`error.an-error-occurred`); a file-step failure leaves the title-only record (`.32`) and still refetches so it lists.
- **Pure-logic core** (`helpDocumentsLogic.ts`) + 7 behaviour-citing tests (`.29`/`.30`/`.33`). Reuses the generated `insertHelpDocument`/`deleteHelpDocument`, `domain/syncFiles`, `UploadZone`, `DataTable`, `ConfirmDialog`.

## Resolved blockers

- **Central-only nav gating** — now a declarative `central` flag on the nav config (`src/nav/navConfig.ts` `NavItem`), threaded through `navModel`, and gated **reactively** in `ShellLayout` on central server + `SERVER_ADMIN`; the help section adds a matching route guard (`CentralAdminOnly`) for direct-URL entry (`.28`). New chrome infrastructure, reusable for any future central-only destination.
- **File-upload HTTP route auth** — not a mismatch: `src/api/graphql.ts` authenticates by the same-origin **session cookie** (no bearer token), exactly what `domain/syncFiles` sends; the inbound-shipments documents tab already ships on it. The upload + inline-view links carry the login cookie.

## Environment / verification

- **No live/visual verification** — the running app (`:3005` → `:8000`) can't reach the help schema (`:8000` is the remote, `PRE_INITIALISATION`); the central schema is on `:8890`. Compile-correct only (`pnpm build`). The contact-form + help-document **wire traps** were, however, re-verified live on `develop` during the reverse spec (#440), so S1's error handling is grounded.

## Candidate spec refinements

- **`.17`** says the user guide localises for es/fr; the real client also localises **pt** (implemented from the client source) — the case undercounts.
- **Central-only nav gating** now has a home — the `central` flag on `navConfig` + the `ShellLayout` gate. Worth a short chrome/`ui-standards` note documenting the pattern so future central-only destinations reuse it rather than re-deriving.
