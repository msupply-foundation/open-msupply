# Spec build report

**Target stack:** SolidJS + Vite, shared component library in `src/ui/` (roles resolved via `spec/ui-standards/components.md`).

**Scope of this run:** `dashboard` only (scoped run; no other vertical touched).

## dashboard

Built fresh into `src/sections/dashboard/` (no prior implementation existed). One screen (S1) mounted at both the store root `/` (the landing screen) and the `dashboard` nav destination. Wire surface: the six split count queries in `dashboardCounts.graphql`; the display-gate preferences ride on the shared guard-3 `storeContext` query (five `PreferencesNode` fields added, additively). Gates green: `pnpm check`, `pnpm test` (282), `pnpm build` (dashboard page = its own lazy chunk, ~4.3 kB gzip).

### AC coverage

| AC           | Test                                                | Notes                                                                                                                                                  |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-D1        | `dashboardCounts.test.ts`                           | wire surface is queries only, all `storeId`-scoped; store-switch refetch is resource keying (code-level)                                               |
| AC-D2        | `panelState.test.ts`                                | forbidden → in-panel permission error, unexpected → in-panel generic error; per-panel isolation is one resource per family (`DashboardPage.tsx`)       |
| AC-D3        | —                                                   | three widgets with gated panels/stats composed in `DashboardPage.tsx`; no component-test env — verify against the running app                          |
| AC-D4        | —                                                   | **not covered** — plugin contribution mechanism is the plugins vertical's (greenfield, unbuilt)                                                        |
| AC-D5        | —                                                   | **not covered** — as AC-D4                                                                                                                             |
| AC-D6        | — (partial)                                         | gated-off external panel never fetches (resource source pauses); plugin error isolation not covered (as AC-D4)                                         |
| AC-R1        | `dashboardCounts.test.ts`, `statLinks.test.ts`      | count values are server-computed (C2 gap below); window/status link filters tested                                                                     |
| AC-R2        | `dashboardGates.test.ts`                            | procurement gate both states; partition is server-side                                                                                                 |
| AC-R3        | —                                                   | server-computed count wired verbatim (`request.draft`); C2 gap                                                                                         |
| AC-T1        | `statLinks.test.ts`                                 | link restates New/Allocated/Picked; count server-computed                                                                                              |
| AC-T2        | —                                                   | server-computed count wired verbatim (`response.new`); C2 gap                                                                                          |
| AC-T3        | `dashboardGates.test.ts`                            | program-module gate both states; alert emphasis at > 0 in `DashboardPage.tsx`                                                                          |
| AC-E1        | `statLinks.test.ts`                                 | expired link ≤ today; count server-computed                                                                                                            |
| AC-E2        | `statLinks.test.ts`, `dashboardCounts.test.ts`      | D = 30 sent explicitly; subtraction is server-side (validated live per spec)                                                                           |
| AC-E3        | `statLinks.test.ts`                                 | 30–89-day link window, 90th day excluded; count server-side                                                                                            |
| AC-E4        | `dashboardGates.test.ts`, `statLinks.test.ts`       | gate both states + threshold-day link window                                                                                                           |
| AC-S1, AC-S2 | —                                                   | server-computed counts wired verbatim (`total`, `noStock`); C2 gap                                                                                     |
| AC-S3        | `dashboardGates.test.ts`                            | look-back gate both states                                                                                                                             |
| AC-S4, AC-S5 | —                                                   | server-computed (`lowStock`/`highStock`); thresholds sent explicitly (AC-S8)                                                                           |
| AC-S6        | `dashboardGates.test.ts`                            | alert-threshold gate both states                                                                                                                       |
| AC-S7        | `dashboardGates.test.ts`                            | gate both states; the threshold-0 degenerate count is never rendered                                                                                   |
| AC-S8        | `dashboardGates.test.ts`, `dashboardCounts.test.ts` | explicit low/high from store prefs; fetch pauses until prefs resolve; `daysTillExpired` always 30                                                      |
| AC-N1        | `statLinks.test.ts`                                 | every built list's link filter restates its count; unbuilt lists land on registered placeholders unfiltered (per the AC's own carve-out)               |
| AC-X1        | —                                                   | permission check (`hasPermission` → `reportPermissionDenied`) + handoff in `DashboardPage.tsx`; no component-test env — verify against the running app |

### Flags

- **C2 (real backend):** no CI tooling exists for the real-backend leg. Every count value is server-computed and wired verbatim; the client-side logic (gates, links, thresholds, panel states) is covered at the logic level. The spec's own validation notes record live verification of the counts.
- **Plugins extension surface (AC-D3–D6):** the plugins vertical is greenfield/unbuilt. The built-in widgets/panels/stats are composed explicitly (kdd/explicit-composition) with their S3 published ids recorded as structural comments in `DashboardPage.tsx`; the merge/suppress mechanism awaits the plugins vertical. No id registry was invented.
- **Internal vs external inbound links (contract › navigation correspondence):** the inbound-shipments list encodes `type` as a permission-scope query variable, not a URL filter, so the internal/external kind is not currently expressible in a stat link — the internal and external panels' window/status links are otherwise correct but open the same (scope-union) list. Needs the inbound list to expose the kind in its URL contract; until then this is the placeholder-style degradation.
- **Order more (AC-X1):** the internal-order create flow is the requisitions vertical's, which is unbuilt — the shortcut is permission-gated and then degrades to the registered `replenishment/internal-order` placeholder (the AC-N1 rule applied to the create handoff). Revisit when internal orders ship.
- **Cross-section create-flow imports:** the New inbound / New outbound shortcuts lazily import `CreateInboundShipmentModal` and `CustomerSearchModal` from their owning sections (self-contained modals; loaded on first use). If more consumers appear, hoist them to `src/domain/` like the reports selector.
- **Schema drift in other verticals (C7):** running `pnpm codegen` regenerates `outbound-shipments` and `stock` generated files against the newer pinned schema (`InvoiceFilterInput.dynamicFilter`, `StockLineFilterInput.campaignId`), which breaks those verticals' exhaustive filter maps. Those regenerations were reverted (out of scope); those verticals need a regen + filter-map pass on their next build.
- **Expiring-soon link boundary:** per the captured contract table the link spans today…today+30 while the count excludes lines already expired (≤ today) — a line expiring exactly today appears in the opened list but is counted under _expired_. Candidate spec refinement: start the soon link at today+1.
- **Locale keys:** all labels resolved to existing catalog keys verbatim (incl. `label.inbound-not-delivered`, confirmed against the reference app's dashboard); no new keys minted.
- **Test hooks (C8):** `e2e/TESTIDS.md` defines no dashboard-specific ids; nothing to place.

### Candidate spec refinements

- Decide the inbound list's URL contract for the internal/external kind so the dashboard's panel links can differ (the contract's `type` note assumes a filterable input).
- The expiring-soon link's lower bound (today vs today+1) — see flag above.
- State what the create shortcut should do while its owning vertical is unbuilt (this build applied AC-N1's placeholder rule by analogy).
