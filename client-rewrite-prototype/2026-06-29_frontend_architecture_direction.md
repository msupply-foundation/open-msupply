# Front-end architecture direction

- _Date_: 2026-06-29
- _Status_: Under discussion (recommendation, not yet decided)
- _Audience_: open-mSupply development team

## TL;DR

- Our front-end pain (runaway re-renders, "heavy" MUI, over-complex data hooks) is **real**, but it is caused by **how we use** our tools, not by the tools themselves. A rewrite relocates these problems; it doesn't fix them.
- **Stay on React.** "React vs vanilla JS" is the wrong question — vanilla makes our worst problem (hard-to-trace state) *worse*, not better.
- **Embrace the simpler-UI instinct** (plain HTML + CSS, with a few headless specialised components) — but do it **incrementally** on the existing app, not as a big-bang rewrite.
- A plain-JS, no-TypeScript clone is the wrong production foundation — and **the fact that Claude Code is central to how we work makes that more true, not less.** Types and tests are the verification layer that lets AI move fast *safely*.

## Where we are today

The current front end is large and modern, not legacy:

- **~237,000 lines** of TS/TSX across **~2,700 files** in ~15 workspace packages (`common`, `system`, `invoices`, `requisitions`, `inventory`, `coldchain`, `programs`, …).
- **React 19**, **MUI 6**, **TanStack Query 5**, Zustand, emotion CSS-in-JS, `material-react-table`, i18next — all current versions.
- Ships to **three targets**: web, **Electron** (desktop), **Android** (Capacitor).
- **12 languages** with up to 17 namespaces each, **including right-to-left Arabic**.
- **56 generated, typed GraphQL operation files** (schema → client contract), **91 test files**, plus offline sync, RBAC/permissions, printing/reports, and plugins.

We are not fighting an outdated stack. We're fighting accumulated complexity in how we use a current one.

## The diagnosis: tools vs. usage

| Symptom | What we blame | Actual root cause |
|---|---|---|
| Infinite / runaway re-renders | React | Unstable deps, context holding fast-changing values, new object/array/function identities each render, `useEffect` loops |
| "Heavy" components | MUI | emotion's **runtime** CSS-in-JS cost + the weight of `material-react-table` |
| Over-complicated data fetching | react-query | An abstraction-discipline problem layered *on top of* Query — not Query itself |

The key consequence: **a rewrite with the same team and the same habits reproduces the same problems in a new codebase** — except now after a long feature freeze, with regression risk in a medical-grade system, and (in the prototype's case) without the guardrails that would catch the bugs.

## React vs. vanilla JS

**Recommendation: stay on React.**

Vanilla JS gives a smaller bundle and no re-render model. For *this* app those gains are outweighed:

- We'd hand-roll routing, data binding, lists, virtualisation, and forms — i.e. **build our own (buggy) framework**.
- Our "hard-to-trace state" problem gets **worse**: React at least gives a model to be disciplined within; vanilla gives none.
- Re-render bugs are replaced by **manual DOM-desync and listener-leak bugs**, which are harder to debug.
- Every target (web/Electron/Android) and the whole business layer (GraphQL hooks, i18n, plugins) assumes a component model.
- React is a commodity skill; a bespoke vanilla architecture is not transferable for hiring/onboarding.

The one legitimate framework-level argument is **fine-grained reactivity** (Solid, Svelte 5, signals), which kills the "whole subtree re-renders" class of bug at the framework level. But we can get most of that benefit **inside** React (e.g. signals, better state architecture) without a framework switch — so this argues for fixing state, not for leaving React.

## UI library: the good idea in the plan

The instinct to move toward **plain HTML + CSS, with a few targeted specialised components**, is correct and is current best practice. The way to do it:

1. **Headless component libraries** for the hard parts (e.g. the complex autocomplete): React Aria, Ark UI, Radix, or Downshift. They give us accessibility, keyboard nav, and focus management — the genuinely hard stuff — while we own the markup and CSS.
2. **Lightweight styling** to replace emotion's runtime CSS-in-JS: CSS Modules, vanilla-extract (zero-runtime), or Tailwind. This directly attacks the "heavy MUI" perf complaint.
3. **Tables**: replace `material-react-table` with **TanStack Table** (headless, far lighter, familiar since we already use TanStack Query) + virtualisation for large lists.

Crucially, do this **incrementally, screen by screen, behind the existing routes** (strangler-fig). Every migrated screen is shippable — no big bang, no feature freeze.

## The plain-JS prototype: what it proves, and what it doesn't

A contributor rebuilt much of the core functionality and look in plain JS (no TypeScript) in about a month with Claude Code. That's a genuinely useful signal — but it's important to be precise about what it demonstrates.

**It proves:** the UI layer can be radically simpler, and the simpler-UI direction is viable. Treat it as a valuable **spike / north star**.

**It does not prove:** that an untyped full rewrite is a sound production path. "Most of the functionality and look" is the **visible part of the iceberg**. A month-long clone replicates what shows in a demo; it does not replicate:

- 12-language i18n **including RTL Arabic**;
- the **typed GraphQL contract** keeping client and server in step;
- **offline-first sync correctness** (v5/v6/v7 transports, changelog, conflict handling);
- permissions, printing/reports, plugins, the **test suite**, and **three packaging targets**.

"Replicated most" means the rest was silently dropped — and in a stock/dispensing system you discover *which* parts when a health facility hits a wrong count, not when a demo runs. Much of those 237K lines encodes hard-won real-world rules (Chesterton's Fence): a clone can't reproduce knowledge it can't see.

## Why "Claude Code is central" argues *for* types and structure, not against

This is the most important point for us, and the most counter-intuitive. The tempting reasoning is: *"AI generates code fast, so a rewrite is cheap, so traditional timeframes don't matter."* AI does collapse one cost — but not the ones that matter most here.

**AI shifts the *composition* of cost; it doesn't shrink all of it.**

| Cost | Effect of AI | The untyped clone's approach |
|---|---|---|
| Writing code | ↓↓↓ massively cheaper | exploited fully |
| Knowing it's *correct* | ~unchanged | **skipped** |
| Safely changing it later | depends on structure | **made harder** |

So AI pushes effort toward exactly the things a quick clone skips: verification, comprehension, and safe change.

**Types are the cheapest verification layer — and they matter *more* when an AI writes the code:**

- An LLM's dominant failure mode is **plausible-but-wrong** code. TypeScript catches a large share of that *at author time*, locally and instantly. Strip types out and the only feedback is "run it and see," which misses the silent wrong-data bugs that matter most here.
- Types are **machine-checkable contracts** — what lets Claude Code change one module and get immediate confirmation it didn't break three others. Without them, every AI edit is an unverified guess against an unwritten spec.
- We already generate **end-to-end types from the GraphQL schema**. Going plain JS throws that away, letting the front end drift from the server contract with zero warning — a serious regression for a synced app.

**AI effectiveness is gated by codebase legibility.** If Claude Code is at the heart of our work, the codebase we want is the one **most legible to Claude Code**: clear module boundaries, explicit contracts, and tests it can run to self-check. That is *typed, structured, tested* code. A plain-JS blob with no types and no tests is the **hardest** kind of codebase to modify safely — the model can't tell data shapes without reading the whole call graph, and nothing tells it when it's wrong.

As AI accelerates output, the ratio of *code-that-exists* to *code-a-human-has-actually-read* drops fast. Types and tests are how we keep the unread majority honest. Remove them and we accumulate unverifiable code at AI speed — **compounding risk, not compounding leverage.** The untyped clone optimises month one and taxes every month after.

## Recommended path forward

1. **Profile before committing.** Use the React DevTools Profiler and `why-did-you-render` to quantify the real hotspots (likely a few context providers and table-heavy screens), so decisions are evidence-led.
2. **Fix the re-render root causes** with guardrails: enforce `react-hooks/exhaustive-deps`, stabilise context values, consider signals for the worst offenders.
3. **Trim the data layer**: keep TanStack Query, flatten the over-abstracted wrappers on top of it.
4. **Strangler-fig the UI**: migrate MUI → headless + light CSS one screen at a time, starting with the worst-performing page as the proof of concept.
5. **Use the prototype as a spike, rebuild it typed and incremental**: same simpler-UI philosophy, in TypeScript, behind existing routes, keeping the GraphQL types, i18n, sync, and tests intact.
6. **Point AI where it's strongest *and* safest**: generating typed components, porting screens against a known schema, and writing the tests that lock behaviour. Speed *with* a safety net, not instead of one.

The prototype answers *"can the UI be simpler?"* — yes. It does not answer *"should production be untyped?"* — and because we're betting on Claude Code, the answer there is a firmer **no** than it would have been a few years ago.
