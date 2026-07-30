# `client/perf` — frontend interaction-performance harness

Measures what the app *feels* like: how long an interaction takes to respond,
under a 6× CPU throttle standing in for a low-end Android tablet. Goals, budgets
and constraints live in [CHARTER.md](./CHARTER.md).

This is not the e2e suite. It asserts almost nothing about behaviour; it produces
numbers, and refuses to produce misleading ones.

## Running it

```fish
# 1. With Postgres running, seed the fixture (once per DB). Connection details
#    come from server/configuration (base.yaml, overridden by local.yaml); any
#    PG* env var you set wins. The target store defaults to GEN.
client/perf/seed.sh

# 2. Bring the app up. `yarn start` at the repo ROOT runs the Rust server and the
#    webpack dev server (`cargo run & yarn start-local`); from client/ it starts
#    just the client. Either blocks — leave it running and use a second shell.
yarn start

# 3. Dev, to iterate on a fix
cd client
yarn perf                      # or PERF_RUNS=2 yarn perf for a quick pass

# 4. Production, for ANY number you intend to report. Build the client; the Rust
#    server already serves it on :8000 with the API on the same origin.
yarn build
BASE_URL=http://localhost:8000 PERF_BUILD=prod yarn perf

# Record the current numbers as the comparison point
BASE_URL=http://localhost:8000 PERF_BUILD=prod yarn perf:baseline
```

> Do **not** serve the production build with `yarn serve` on :3003. A production
> build resolves the API to same-origin (`packages/config/src/config.ts`), so on
> :3003 it cannot reach the server on :8000 and the app just shows
> "Server startup in progress".

| Env var | Default | Purpose |
|---|---|---|
| `PERF_RUNS` | `7` | Iterations per scenario. The first is discarded as warm-up. |
| `PERF_BASELINE` | unset | Also write `baseline/<build>.json`, the file future runs diff against. |
| `PERF_BUILD` | unset | Assert the build being measured (`dev`/`prod`). Mismatch = hard failure. |
| `PERF_HEADED` | unset | Run headed, for watching a scenario misbehave. |
| `PERF_DIAG` / `PERF_PROFILE` | unset | Run the diagnostics in `scenarios/diag.perf.ts` (see below). |
| `BASE_URL` | `http://localhost:3003` | Point at `:8000` for production runs. |

The fixture itself is parameterised — `seed.sh` passes extra args to `psql`:

```fish
client/perf/seed.sh -v fat_lines=400     # bigger detail-view fixture
client/perf/seed.sh -v store_code=HUF    # seed into a different store
PGDATABASE=my-db client/perf/seed.sh     # different database
client/perf/seed.sh --clean              # remove it all again
```

Numbers are only comparable against the same fixture parameters, so record any
override alongside the result.

Results land in `results/<build>-<timestamp>.json`; baselines in
`baseline/<build>.json`. Both are gitignored except the baselines, which are the
provenance for any perf claim.

## What it reports

| | Metric | Meaning |
|---|---|---|
| **M1** | interaction latency | Event Timing `duration` — input event to the next paint. **The headline.** |
| M2 | settle | interaction → first frame the scenario's settle predicate holds. Includes network. |
| M3 | blocking | Σ (longtask − 50 ms) in the window. |
| M5 | gql | requests / serial waves in the window. |

Read M1 against M2. **M1 high** is our render cost. **M1 fine but M2 high** is the
server or a request waterfall — file it, don't fix it here.

`p95` at the default run count is the nearest-rank p95 of 6 samples, i.e. the
worst observed run. That is deliberate: 6 points cannot support a smoother
percentile, and pretending otherwise would be false precision.

## Guards against lying to ourselves

The harness is built around the failure modes that have produced bogus perf
claims in this repo before:

- **Build mode is detected, not trusted.** Every report records the actual JS byte
  count and labels the build from it (dev ships ~27 MiB, prod ~5 MiB); if
  `PERF_BUILD` disagrees, the run fails rather than recording a mislabelled
  number. Mixing a dev number with a prod one is a ~4× error, so this is worth
  a hard failure.
- **A scenario that measures nothing fails.** Before each interaction the settle
  predicate is asserted false. Without this, a wrong predicate silently reports
  ~0 ms and looks like a win.
- **Fixed fixture.** Numbers are only comparable against `seed.sql` data. The
  seeder also sets several columns that are nullable in Postgres but non-`Option`
  in the Rust row structs — leaving them NULL makes the server fail the entire
  invoice query with `DIESEL_DESERIALIZATION_ERROR`, taking out real rows too.
- **Real Chrome, one worker.** `channel: 'chrome'` (Event Timing is defined
  against a real paint; the bundled headless shell has no proper compositor), and
  no parallelism, because concurrent runs contend for CPU.
- **Throttle only around the interaction.** Getting back to the pre-state runs
  unthrottled — it is setup, not the measurement.
- Runs are quiesced (wait for a 250 ms longtask-free gap) so one run cannot bleed
  into the next.

Both M1 and M2 are paint-quantised and so carry up to one frame of error. That is
inherent to "when could the user see it", not a defect.

## Adding a scenario

```ts
{
  name: 'stocktake-open-line',      // stable — it is the baseline key
  budget: 'responsive',             // instant <100ms · responsive <500ms · navigational <1000ms
  reset: async page => { … },       // back to the pre-state; runs unthrottled
  ready: `<js expr>`,               // true once reset has landed
  token: `<js expr>`,               // optional: value captured pre-act, readable as __perf.token
  act: async page => { … },         // the interaction — must be real Playwright input
  settle: `<js expr>`,              // true once the user could proceed
}
```

`act` must use real Playwright input: Event Timing only sees trusted events, so a
`dispatchEvent` shim would report `null` for M1.

Beware positional selectors. These views carry very few `data-testid`s, so some
selectors are index-based (the line-edit modal's Issue input) and guarded with an
assertion that fails loudly when the DOM shifts. Prefer a testid when one exists.

Two UI facts worth knowing before writing a scenario for a table page:

- **Sorting is two clicks, not one.** `useTableDisplayOptions` deliberately replaces
  the column-actions button with a full-width invisible one, so clicking anywhere in
  a header opens the column menu; the sort is applied from a *menu item*
  ("Sort by X ascending"). Both clicks are worth measuring, separately.
- **A settle predicate based on row order can never become true on a small table**
  that is already in the target order. Settle on the URL param instead, or use a
  larger fixture.

---

## Diagnosing a new slowness

The sequence below is what found the app-shell re-render bug. Each step is cheap and
rules out a whole class, so run them in order rather than reaching for a profiler
first.

1. **Scale test.** Run the same interaction against a large and a tiny dataset
   (`diag.perf.ts` does this). If the cost barely changes, it is *fixed overhead*,
   not per-row work — which stops you optimising rows when the shell is the problem.
2. **No-op location change.** `history.pushState` + a synthetic `popstate` with a
   param nothing reads: react-router adopts a new location, nothing refetches, no DOM
   needs to differ. Any cost measured this way is *pure waste*, with no legitimate
   work mixed in.
3. **Profiler regions.** Temporarily wrap shell regions in `React.Profiler` and log
   `{id, phase, actualDuration}` per commit. **Commit count matters as much as
   duration** — a `nested-update` is a second render scheduled during commit, so it
   blocks the paint.
4. **Table-free route.** Repeat on a page with no table (e.g. `/dashboard`) to
   separate shell cost from table-layer cost.
5. **Confirm with the harness, on a production build.** A trace attribution is a
   hypothesis; only a harness delta is a result.

`scenarios/diag.perf.ts` holds steps 1, 2 and 3 behind `PERF_DIAG=1` / `PERF_PROFILE=1`.
Step 3 needs temporary `React.Profiler` wrappers added to `host/src/Site.tsx` — it is
a diagnostic, not a standing test.

---

## Strategy cards

Patterns proven on the Outbound Shipment pilot (#12606), with detection signals, so
they can be applied to other verticals. Format is defined in
[CHARTER.md](./CHARTER.md) §6.

### Card 1 — Whole-store zustand subscription

```text
pattern:    const { x } = useSomeStore()        // no selector
            + setters written set(s => ({ ...s, x }))
            ⇒ any write to any field re-renders every consumer
detection:  grep -rn "= use[A-Z][A-Za-z]*\(Context\|Store\)()" packages --include=*.tsx
recipe:     const x = useSomeStore(s => s.x)    // one call per field
            Select fields individually. A selector returning a new object
            (s => ({a, b})) needs `useShallow`, or it defeats the point.
expected:   proportional to how much of the tree consumes the store. For the
            app-shell store: −14% to −43% on mount-heavy interactions.
risk:       Low — it only narrows a subscription.
verify:     any scenario that mounts portals (open a detail view, open a modal)
```

`useHostContext` was fixed in PR #12607. **Still unfixed**, detected but not yet
measured: `useDrawer` (9 sites, incl. every `AppNavLink`), `useKeyboard` (4 sites,
incl. every `Autocomplete` and every modal via `useDialog` — tablet-relevant, since
the on-screen keyboard opening re-renders them all), `useDetailPanelStore` (5 sites),
`useAppBarRectStore` (1). Their triggering interactions are not in the scenario set
yet, so per C5 they must not be fixed blind — adding a drawer-toggle and a
keyboard/autocomplete scenario is the prerequisite.

### Card 2 — A fresh object in a dependency array

```text
pattern:    useEffect(..., [location, ...])  where only location.pathname is used
            ⇒ the effect re-runs on search-param-only changes; if it setStates,
              the subtree re-renders again as a `nested-update`
detection:  grep -rn "\[location" packages --include=*.tsx
            plus any dep array holding a router/query object rather than a
            primitive derived from it
recipe:     depend on the primitive (pathname, or the derived string), not the object
expected:   removes one full re-render pass per URL change: −31% to −49% here
risk:       Low, but confirm the effect still fires when it must — here, on real
            title changes and on mount
verify:     any sort / paginate / filter / tab-switch scenario
```
