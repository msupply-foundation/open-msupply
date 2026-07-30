# Frontend performance charter

Scope: the **legacy `client/`** app. Goal is shippable wins, not evidence for a rewrite. Pilot
vertical is **Outbound Shipment**; once strategies are proven there they fan out to the other
verticals.

The pilot that produced these numbers and the constraints below is issue **#12606** — read it for
the specific findings and the open follow-ups. This file is the standing agreement; the issue is
the point-in-time story.

---

## 1. The one number this effort is judged on

**Interaction latency p95** — for a named user interaction, the time from the input event to the
next paint that reflects the work the interaction triggered, measured under **6× CPU throttle**.

Everything else in §2 exists to *explain* that number, not to replace it.

Why this one: startup bytes are already owned by #12494 / PR #12497, and route-transition time
mixes in server query cost. Interaction latency is what "the app feels slow" actually is, and
nothing in this repo currently measures it.

### Deliberately rejected metrics

| Rejected | Why |
|---|---|
| why-did-you-render render counts | Counts render-phase invocations, not committed renders. Already produced a false "win" on `perf/stock-search` that the running app contradicted. |
| Lighthouse score | Composite, weights network heavily. Our deployments are tablet + **local** server, so network is not the constraint. |
| Average frame rate | An average hides the single 600 ms stall that is the actual complaint. |
| Bundle size (as *this* effort's goal) | In flight elsewhere (#12494). Tracked here only as a non-regression guard. |

---

## 2. The metric set

Recorded per scenario, per run, by `client/perf` (see `README.md`).

| ID | Metric | Definition | Role |
|---|---|---|---|
| **M1** | **Interaction latency** | Event Timing API `duration` for the triggering event (input → next paint). Reported median + p95. | **Headline / gate** |
| M2 | Settle time | Click → the DOM state that means the user can proceed (rows present, modal fields populated). Includes network. | Separates client render cost from server cost |
| M3 | Blocking time | Σ (longtask.duration − 50 ms) over the interaction window. | Predicts jank on the real device |
| M4 | Startup JS (gzip) | Entry + eager chunks from `build-stats`. | Non-regression guard only |
| M5 | GraphQL round trips | Request count + max serial depth per scenario. | Usually explains a bad M2 |

M1 vs M2 is the important pair. M1 bad + M2 fine ⇒ our render cost. M2 bad + M1 fine ⇒ the
server or the waterfall (→ file it, don't fix it here; see constraint C8).

---

## 3. Measurement protocol

Non-negotiable, because the numbers are worthless if they drift between runs.

- **Device proxy:** 6× CPU throttle via CDP `Emulation.setCPUThrottlingRate`. **No network
  throttling** — deployments are tablets against a local server.
- **Build:** iterate against the **dev** build; every *recorded or reported* number comes from a
  **production** build. **Never compare a dev number to a prod number** — they are different
  units. Measured ratio: the same sort was **1832 ms dev vs 472 ms prod**, so dev runs ~3–4×
  slower.
  - Dev-mode React plus the WDYR `createElement` patch in `packages/host/src/bootstrap.tsx`
    inflate render cost, so dev overstates the payoff of render-side fixes. Dev is for
    *direction*, prod is for *magnitude*.
  - **Serve the production build from the Rust server on `:8000`**, not `yarn serve` on `:3003`.
    A production build resolves the API to same-origin (`packages/config/src/config.ts`), so a
    static server on a different port than the API cannot reach it and the app hangs on
    "Server startup in progress".
- **Data:** the seeded `perf-*` fixture only (`client/perf/seed.sh`). Store `GEN` by
  default, user `Admin`/`pass`. A number taken against unseeded data is not a number, and
  two numbers taken with different fixture parameters are not comparable — record any
  override with the result.
- **Runs:** 7 iterations per scenario, first discarded as warm-up, report median and p95 of 6.
- **Serial:** 1 worker, no parallel tests — parallel runs contend for CPU and poison the numbers.
- **Quiet machine, or don't bother.** The same suite run while the developer was working (VS
  Code, a browser, a VM) came out **2–3× worse across the board** than on an idle machine —
  `list-sort` p95 936 → 2176 ms. Under a 6× throttle the harness has only a sixth of a core to
  play with, so anything else running shows up directly.
  - **The tell is the control scenarios.** If interactions the change cannot possibly affect
    (opening a column menu, typing in a line-edit field) also move, and the median-to-p95 spread
    widens, it is contention — not a regression. Re-run when idle rather than believing it.
- **Noise:** dev run-to-run variance is **±15%**, which sits uncomfortably close to the ≥20%
  merge gate in C5. Decide borderline changes on a production build, or raise `PERF_RUNS`.
- **Provenance:** every perf claim in a PR cites a committed baseline JSON. No claim without a run.

### Two traps that have already produced wrong answers here

- **Trace *durations* are not evidence; trace *stacks* are.** Chrome DevTools attributed 1310 ms
  to MRT's `measureElement` and 1290 ms to style recalculation. Implementing the first produced
  **no measurable win** (+4%, inside the noise band) and was reverted. Tracing overhead inflates
  exactly the operations traces are best at naming. Attribute with a trace, decide with the harness.
- **M1 under-reports debounced interactions.** A filter keystroke is cheap (local state); the
  expensive URL write happens in a `setTimeout` afterwards, so the Event Timing entry never sees
  it. Judge those scenarios on M3 (blocking) and M2 (settle) instead.

---

## 4. Budgets and goals

Budgets are the **absolute UX thresholds** (RAIL), applied at 6× throttle — legitimate because the
throttled machine *is* the device proxy, not a handicap on top of one.

| Class | Budget (M1 p95) | Interactions |
|---|---|---|
| Instant | **< 100 ms** | column sort, tab switch, typing in a cell, row select, checkbox |
| Responsive | **< 500 ms** | open a modal, page a list, apply a filter |
| Navigational | **< 1000 ms** (M2) | route change including data fetch |

Assigning the class is a judgement call and part of the work, and getting it wrong manufactures
fake violations. The pilot classed the Details→Log tab switch as `instant`, which made a 352 ms
result look like a 3.5× breach; but that interaction unmounts a 150-row table, mounts a different
table and fetches its data. That is a view transition, not a widget toggle. The budget was wrong,
not the app.

Goals for the pilot, in priority order:

1. **No scenario over 2 s p95.** Anything there is treated as a bug, not a budget miss.
2. **−50 % M1 p95** on every scenario that starts above its budget class.
3. **Budget compliance** where reachable without breaking constraint C2/C3.
4. **M4 not regressed** by any change made here.

### Recorded baselines

| file | what it is |
|---|---|
| `baseline/prod.json` | pre-pilot production state (`main` @ bb036d77) |
| `baseline/prod-after-fixes.json` | after the two fixes in #12606 / PR #12607 |
| `baseline/dev*.json` | the dev-build equivalents — **3–4× slower**, never quote them as results |

Worst offenders at the production baseline were `detail-sort-lines` 616 ms, `list-page-next`
488 ms and `list-sort` 472 ms. After the fixes every scenario sits inside its budget class.

---

## 5. Constraints

| # | Constraint |
|---|---|
| C1 | **Measurement discipline** exactly as §3. Dev to iterate, prod to claim, never mixed. |
| C2 | **No dependency swaps.** material-react-table, MUI, react-query, webpack Module Federation all stay. |
| C3 | **Behaviour-preserving.** No UX changes to buy speed (no swapping pagination for virtualization, no dropping features). If a fix needs a UX change it becomes its own issue. |
| C4 | **Shared `packages/common` is fair game** — that is where the cost lives — but any change there must be validated by the harness on **≥ 2 verticals** before merge. |
| C5 | **Merge gate:** a change lands only if it moves a recorded metric by **≥ 20 %** on at least one scenario, or is pure prerequisite work (harness, instrumentation, fixtures). No speculative `useMemo`. |
| C6 | **No new runtime dependencies.** devDependencies for measurement only. |
| C7 | **Pilot is Outbound Shipment only** (list, detail, line edit, save). Fan-out starts only after the pilot produces written strategy cards (§6). |
| C8 | **Not the server.** If M2/M5 show the cost is a slow GraphQL query, file it (cf. #12054) and move on. |
| C9 | **Two-attempt rule.** If a scenario resists two genuine attempts, document it as an architectural ceiling and stop. Those ceilings are the honest input to the client-next decision — but chasing them is out of scope here. |
| C10 | Existing `yarn test` and the Playwright e2e suite stay green. |

---

## 6. Fan-out (after the pilot)

Each confirmed fix becomes a **strategy card** in this format:

```text
pattern:    what the slow shape looks like
detection:  a grep / lint rule / AST signal that finds it elsewhere
recipe:     the fix, concretely
expected:   which metric moves, by roughly how much
risk:       what it can break
verify:     which scenario proves it
```

**The cards themselves live in [README.md](./README.md)** — they are working instructions, kept
next to the harness that verifies them. This section only fixes the format.

Only then does the workflow phase run: one agent per vertical, each doing
detect → fix → **harness-verify on its own vertical**, reporting a before/after number. The
harness is what makes that fan-out safe — an agent cannot claim a win it did not measure.

Fan-out queue: inbound shipment · prescriptions · request requisition · response requisition ·
stocktake · stock list · item catalogue · customer/supplier returns · patients · dashboard ·
coldchain monitoring.
