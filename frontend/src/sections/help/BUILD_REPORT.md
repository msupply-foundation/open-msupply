# Build report — help

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Scoped build of the help vertical (`spec/help`), stacked on the help reverse-spec (PR #440). Gates green repo-wide: `pnpm check` ✓ · `pnpm test` ✓ (341, incl. 5 new help AC tests) · `pnpm build` ✓. GraphQL generated against `:8890` (`develop`, central) via the scoped codegen runner (`:8000` is the remote / `PRE_INITIALISATION`).

## Built — S1 Help page (universal)

- User-guide **external link** (localised es/fr(+fr-DJ)/pt, else default — `.17`); keyboard-shortcuts static text; **help-documents** list (showable-only, newest-first, external file links — `.18`/`.19`/`.20`); **contact form** (Feedback/Support · email · message; async Send gated by `canSendContactForm`; inline email note; outcome `Alert`; `insertContactForm` via `returnGraphqlErrors`; reset on success — `.2`-`.9`, `.23`, `.25`, `.26`). The `help` route already existed — the stub component was swapped, no `App.tsx` change.
- Pure-logic core (`helpLogic.ts`) + 5 behaviour-citing tests.

## Behaviour coverage (`OMS-REG-HLP-01.*` — [case](../../../spec/help/cases/OMS-REG-HLP-01%20-%20Validate%20Help%20Page%20and%20Contact%20Form.md))

| Behaviour                                                    | Where               | Status                                                                                                |
| ------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `.17` user-guide localised URL                               | `helpLogic.test.ts` | ✅ tested                                                                                             |
| `.18`/`.19` documents block skips fileless / hides empty     | `helpLogic.test.ts` | ✅ tested                                                                                             |
| `.20` file-view URL                                          | `helpLogic.test.ts` | ✅ tested                                                                                             |
| `.2`-`.7` send-gating; `.23` email format                    | `helpLogic.test.ts` | ✅ tested                                                                                             |
| `.15` universal ordered page; `.25`/`.26` outcome+reset      | `HelpPage.tsx`      | ⚠️ built, not unit-tested (UI-level)                                                                  |
| `.24` server guard; `.21` view-session; `.22` not-synced 404 | —                   | ❌ server/HTTP — re-verified live on `develop` during the reverse spec (#440), not unit-testable here |
| `.28`-`.35` management; `.36`/`.37` distribution             | —                   | ❌ not built (flagged)                                                                                |

## Flags — not built (S2 management + S3 upload, central-only)

- **Central-presence nav gating is unsupported by the current chrome nav** — `NavItem` has no central flag and `MenuBar` doesn't filter, so the spec's "Manage › Help documents entry **absent** on non-central" (`.28`) can't be expressed yet. Needs a chrome/nav addition (candidate spec/infra refinement).
- **File-upload HTTP route** (`POST /sync_files/help_document/{id}`, multipart, **session-cookie** auth) — this app authenticates by **bearer token**, so whether the login cookie that route requires is present is **unverified** (integration risk). Same for the inline file **view** (`GET`), which the built S1 links to.
- The record-level ops are ready (`insertHelpDocument`/`deleteHelpDocument` generated) and the components exist (`DocumentUploadPanel` + `UploadZone` — the registry rows the spec PR added), so S2/S3 is a bounded follow-up once the two gaps above are resolved.

## Environment / verification

- **No live/visual verification** — the running app (`:3005` → `:8000`) can't reach the help schema (`:8000` is the remote, `PRE_INITIALISATION`); the central schema is on `:8890`. Compile-correct only (`pnpm build`). The contact-form + help-document **wire traps** were, however, re-verified live on `develop` during the reverse spec (#440), so S1's error handling is grounded.

## Candidate spec refinements

- **`.17`** says the user guide localises for es/fr; the real client also localises **pt** (implemented from the client source) — the case undercounts.
- **Central-presence nav gating** (`.28`) has no home in the current chrome nav model — worth a chrome/`ui-standards` note on how a central-only destination is expressed.
