# Benchmark harness — state-management comparison

_Implementation brief for the agent building this. Status: spec, not yet built._

## Purpose

Produce a **demoable, self-contained benchmark** that shows — with live on-screen numbers and a scaling curve — that granular subscription-based state (Zustand) updates a large controlled form without re-rendering every consuming component, whereas today's "single state object in context" approach re-renders the whole form on every keystroke.

The output is persuasion material for colleagues (ties to `ARGUMENTS.md` #2/#3 and the `SPEC.md` INP < 200 ms target). It must be **honest and reproducible** — no strawman baseline, real production build, throttled to the target device.

Related decisions: `DECISIONS.md` (React, Vite, CSS Modules) and the in-flight **state management** decision this harness exists to inform.

---

## Core design principle: one app, swappable state adapter

Do **not** build two branches — they drift and invite "not apples-to-apples" objections. Build **one form component tree** written against a single adapter interface, with multiple implementations selected at runtime. The provably-only difference between conditions is the state mechanism.

### The adapter interface

Every input and every reactive reader is written **once** against this interface — it must never know which implementation is mounted:

```ts
interface StateAdapter {
  useField(path: string): [value: unknown, setValue: (v: unknown) => void];
  useDerived<T>(selector: (draft: Draft) => T): T; // for reactive/derived readers
  reset(initial: Draft): void;
}
```

Switching approaches = swapping which **provider** wraps the form. That is the whole mechanism.

### Implementations (tiers)

Run more than two conditions so the baseline is honest and common rebuttals are pre-empted:

1. **`naive`** — single state object in React context, no memoisation. The accidental default; represents today's pain.
2. **`context-memo`** — same context approach but `React.memo` on inputs + split contexts. Shows the ceiling of the incremental fix.
3. **`zustand`** — external store, per-field selector subscriptions. The proposal.
4. **`naive-compiler`** _(optional, recommended)_ — tier 1 built with **React Compiler** on. A colleague *will* raise "React Compiler auto-memoises that." Better to have the number before the meeting than during it.

> **Open decision (Carl):** ship all 4 tiers, or just `naive` vs `zustand` for the first cut? Default to at least tiers 1–3.

Each tier is a provider (`NaiveStateProvider`, `ContextMemoStateProvider`, `ZustandStateProvider`) implementing `StateAdapter`.

---

## The form under test

Must stress the actual mechanism, not a toy:

- **Scalable field count** — render `N` controlled inputs where `N` is a URL param (`fields=50|200|500|1000`). The divergence between tiers *is* the argument, and it only shows at scale.
- **Controlled inputs** — form data is controlled (not uncontrolled), because that is the pattern being evaluated and where the naive approach hurts.
- **Several reactive readers** consuming the draft — include at least: a running total, an item count, a validation summary, a live JSON preview, and a progress bar. Put the **same readers in every tier** so derived-recompute cost is equal across conditions; the only variable is *how many components re-render*.

Correct behaviour to preserve: a reader *should* re-render when its derived value actually changes, in every tier. The difference the benchmark exposes is the **unrelated inputs** re-rendering in the naive tier but not in Zustand.

---

## The floating window (HUD + toggle, combined)

A single small draggable floating window, always on top, containing **both** the live metrics and the provider toggle. This is the primary demo surface.

### Contents

**Controls (top):**
- **Provider toggle** — segmented control `[ Naive | Context+Memo | Zustand ]` (show only the tiers that are built). Switching swaps the provider live (see mechanism below).
- **Field count** selector (50 / 200 / 500 / 1000).
- **Render-flash** on/off toggle (see below).
- **Reset** button — zeroes all counters and running stats.
- **Run benchmark** button — fires the automated scripted run for the current tier and appends a result row.

**Live metrics (updated as the user types/clicks):**
- **Renders in last interaction** — the headline number ("1" vs "312").
- **Last interaction latency (ms)** — real INP for the last interaction.
- **Running INP p95 / max (ms)** — accumulated over the session.
- **FPS** — live, drops visibly under naive jank.
- **Total renders since reset** — running counter.
- **Long tasks (>50 ms)** — running count.
- **Header line** — `impl=<tier> · fields=<N>`.

### How each metric is captured (production-build safe)

- **Render counts (live HUD):** a manual render registry — a one-line hook `useRenderCount(id)` that increments a shared counter on every commit — dropped into each input and reader. Works in **any** build; negligible cost. **Do not** rely on `<Profiler>` `onRender` for the live HUD (it is a no-op in the standard production build).
- **Interaction latency / INP:** a `PerformanceObserver` on `event`-timing entries with `durationThreshold: 0`, driven by **real DOM input events**. This is the same instrument Lighthouse uses — that's why it's credible.
- **FPS:** a `requestAnimationFrame` loop measuring frame delta.
- **Long tasks:** a `PerformanceObserver` on `longtask` entries.
- **Precise commit time (offline benchmark only):** `<Profiler>` `actualDuration` — used by the automated run for exact per-commit numbers, not by the live HUD.

The HUD and its instrumentation add tiny overhead **equally to all tiers**, so they don't bias the comparison. Note this if asked.

---

## Render-flash highlighting (the visceral demo)

Built-in equivalent of React DevTools "highlight updates": a wrapper that flashes a coloured outline on each component every time it commits (toggle a `box-shadow`/`outline` class on render, clear it after a short `setTimeout`). Type one character → the whole form lights up in `naive`, only the single field blinks in `zustand`. Controlled by the HUD's render-flash toggle so the demo can be run clean.

---

## Switching between approaches

One mechanism (`impl` value selects the provider), three entry points:

1. **In-app toggle (live demo)** — the segmented control in the floating window. Swapping providers requires a clean remount so no stale state leaks between stores:
   ```jsx
   <StateProvider impl={impl}>
     <BenchmarkForm key={impl} fields={n} />  {/* key change → fresh mount */}
   </StateProvider>
   ```
   No reload; type, flip, type again.
2. **Side-by-side (primary, most persuasive)** — mount two providers at once in two panes, each with its own floating HUD, so "312 renders" sits next to "1 render" simultaneously. Two independent provider subtrees on one page; they don't interfere. **Lead the demo with this.**
3. **URL param (reproducible benchmarks)** — `?impl=zustand&fields=500&trials=5` reads into the same `impl`/`fields` state at boot; this is what the automated run uses so results are scriptable and shareable.

Build all three; they resolve to the same switch. Side-by-side is the headline demo mode; the toggle shows a full-width realistic form.

---

## Automated benchmark run (for trustworthy numbers)

Triggered by the "Run benchmark" button or the URL param. Must be deterministic:

- A scripted run of a fixed number of keystrokes (e.g. 200) spread across fields at a fixed cadence via `requestAnimationFrame`, seeded so it's identical across tiers.
- Dispatch **real DOM input events** so the `event`-timing / INP instrumentation fires.
- Discard warm-up runs, then run N trials.
- Report **median and p95** (p95 is where naive jank lives — the number that maps to "feels laggy"). Never a single mean.
- Collect per-run: renders-per-keystroke, INP median/p95, commit time median/p95 (`<Profiler>`), long-task count.

---

## The money artifact: scaling curve

An in-page chart: field count on the x-axis (50 → 1000), median INP (and, as a second series, renders-per-keystroke) on the y-axis, **one line per tier**. Naive climbs ~linearly; Zustand stays flat. This is the slide.

- Render it in-app.
- **Export CSV/JSON** so it drops into the deck and a colleague can re-run it themselves.

---

## Fairness controls (keep it honest — call these out in the demo)

- **Production build** (`vite build` + preview), never dev — the naive-vs-granular gap is real but *magnified* in dev, so demoing in dev would look like cheating.
- **CPU-throttle to the target device** — 4–6× throttle in DevTools, or better, run final numbers on the actual **Lenovo M10 gen2** (`SPEC.md`). Dev-laptop numbers prove nothing about a tablet.
  > **Open decision (Carl):** throttled desktop for convenience vs the real M10 for an unimpeachable result.
- **Disable StrictMode** for measured runs (or account for its double-render).
- **Warm-up discarded**, N trials, median + p95.
- HUD/flash overhead applied equally to all tiers.

---

## Suggested structure

A `benchmark/` route in the prototype app (`app/`):

```
app/src/benchmark/
  StateAdapter.ts            # interface + Draft type
  providers/
    NaiveStateProvider.tsx
    ContextMemoStateProvider.tsx
    ZustandStateProvider.tsx
  BenchmarkForm.tsx          # the scalable controlled form + reactive readers
  fields/                    # input + reader components (written against the adapter)
  hud/
    PerfHud.tsx              # floating window: metrics + provider toggle + controls
    useRenderCount.ts        # manual render registry
    useInp.ts                # PerformanceObserver: event timing
    useFps.ts, useLongTasks.ts
    RenderFlash.tsx          # highlight-on-commit wrapper
  run/
    scriptedRun.ts           # deterministic automated interaction
    stats.ts                 # median/p95
  ScalingChart.tsx           # results chart + CSV/JSON export
  BenchmarkPage.tsx          # single-toggle mode
  SideBySidePage.tsx         # two panes, primary demo mode
```

Keep the chart dependency light (or hand-draw with SVG/CSS) — this is a prototype whose thesis is bundle discipline.

## Acceptance criteria

- One form tree; tiers differ only by provider (verifiable in the diff).
- Floating window combines live metrics **and** the provider toggle in one draggable panel.
- Switching providers live updates the numbers with no reload; side-by-side mode shows both simultaneously.
- Render-flash visibly shows whole-form vs single-field re-render.
- Automated run produces median + p95 for renders/keystroke and INP, exportable as CSV/JSON.
- Scaling curve renders in-app across field counts, one line per tier.
- Runs against a production build under CPU throttle.
