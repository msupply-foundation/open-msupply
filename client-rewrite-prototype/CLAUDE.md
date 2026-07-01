# client-rewrite-prototype

Home of the **open-mSupply front-end rewrite prototype**. Exploratory / spike status — not production. The goal right now is to build **one vertical slice** that can be demoed and that validates the principles below.

## How to work in this folder (read this first, every session)

This file is auto-loaded into context. The detailed, living records are kept *out* of here so this file stays a lean, stable anchor. At the **start of a session**, read:

- [`STATUS.md`](./STATUS.md) — what's done, in progress, and next. Read this to pick up where we left off.
- [`DECISIONS.md`](./DECISIONS.md) — every architectural decision and the reasoning behind it. Read before proposing or changing an approach.
- [`ARGUMENTS.md`](./ARGUMENTS.md) — Carl's arsenal of arguments for presenting these decisions to colleagues. When a strong justification surfaces, add it here as presentable talking points (with rebuttals to likely pushback).
- [`SPEC.md`](./SPEC.md) — the **dev lead's** external brief and acceptance criteria (perf targets, capability checklist, scope constraints). This is *not* Carl's analysis; in places it diverges from our decisions. Treat it as the bar we're measured against, and keep its content distinct from Carl's thoughts/decisions when editing docs.
- [`UI_ELEMENTS.md`](./UI_ELEMENTS.md) — ledger of every UI element built and what it's made of (hand-rolled vs. which headless library, and why).

As we work:

- **When an architectural decision is made**, append an entry to `DECISIONS.md` (date, decision, why, alternatives rejected). Carl wants every choice backed by a solid, recorded argument.
- **Keep `STATUS.md` current** — update it when something is finished or when work is handed off mid-task.
- **When a UI element is built or its composition changes**, update `UI_ELEMENTS.md` (element → hand-rolled / which library + why).
- **Keep this file lean.** Stable principles and pointers only. Logs and progress go in the two files above.

## Founding principles

Full reasoning: [`2026-06-29_frontend_architecture_direction.md`](./2026-06-29_frontend_architecture_direction.md). In brief:

- **React + TypeScript — non-negotiable.** TS is the verification layer that lets AI-assisted development move fast *safely*; the LLM failure mode is plausible-but-wrong code, and types catch a large share of it at author time. No plain JS.
- **Simpler UI by default.** Plain HTML + CSS where possible; reach for **headless** components (accessibility/keyboard/focus handled, we own the markup + styling) only for the genuinely hard widgets (e.g. complex autocomplete). Avoid heavyweight component kits and runtime CSS-in-JS.
- **Keep the typed contract.** Preserve end-to-end GraphQL types from the server schema.
- **Lightweight, traceable state.** The original app's pain was hard-to-trace state and runaway re-renders — avoid recreating it. Prefer simple, explicit state with clear render boundaries.
- **Incremental mindset.** Even though this is a fresh prototype, favour patterns that could later be adopted screen-by-screen in the real app.
- **Intrinsic layout; breakpoints only for "which element."** Default to elements that flow and wrap on their own (flex/grid, `flex-wrap`, `min()/clamp()`, logical properties). Use a breakpoint *only* to decide which whole element to render (e.g. docked sidebar vs. hamburger overlay) — never to tweak spacing/sizes at arbitrary widths. Breakpoints live in `app/src/styles/breakpoints.ts`. See `DECISIONS.md` (2026-07-01, responsive layout).
- **Size in rem/em, never px** (except hairline borders and shadow offsets). Everything scales from a single root font-size (`html` in `index.css`) — e.g. the phone view drops root to 85% to shrink the whole UI uniformly. Design tokens carry the rem values; icons use `1em` so they scale with local text.

## Stack as decided

Decisions are recorded in `DECISIONS.md` as we make them. See that file for current state — do not duplicate it here.
