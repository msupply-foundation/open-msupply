# SPEC — the dev lead's brief (external)

> **Provenance.** This file captures the **dev lead's** spec for the *OMS Front-end Rebuild* (dated **July 2026**), written for the RnD day. It is the **external brief and acceptance criteria** — the requirements and the bar the rebuild is measured against.
>
> It is **not** Carl's analysis. Carl's own recommendations, decisions, and persuasion arguments — some of which **differ** from the spec's framing — live in [`DECISIONS.md`](./DECISIONS.md), [`ARGUMENTS.md`](./ARGUMENTS.md), and [`2026-06-29_frontend_architecture_direction.md`](./2026-06-29_frontend_architecture_direction.md).
>
> Everything **above** the `---` divider near the end is faithful to the dev lead. The clearly-marked **Reconciliation notes** below the divider are **Claude's** synthesis (mapping the spec onto our recorded decisions) — neither the dev lead's words nor Carl's decisions.

---

## Why the rebuild (dev lead's motivations)

1. **Performance.** Testing, field observations, and country-team feedback consistently say OMS is slow on the low-spec tablets/PCs used in deployments. This hurts adoption and confidence.
2. **Maintainability & developer velocity.** As AI tooling becomes a bigger part of the workflow, a consistent, well-structured codebase matters more. The current stack is complex enough to slow both humans and AI assistants. A cleaner foundation accelerates development, reduces onboarding time, and makes AI-assisted coding more reliable.
3. **Mobile responsiveness & UI consistency.** OMS has proven functionality across many supply-chain workflows but isn't optimised for tablets and lacks a consistent visual/interactive language. These gaps compound — slower adoption, more errors, higher training overhead.

## RnD day brief

Greenfield prototype of how you'd build the open-mSupply front end (preferred tech stack, tools, code structure, how to align AI on goals, how to test performance, etc.). Each developer gets a **15-minute** presentation to the team. **Failed experiments are welcome.** Three focuses:

- **Performance** — feels responsive/fast even on older devices; aim for very high-performance front-end interactions so there's headroom for future features and longer support for old devices. A design pattern that keeps things fast *from the ground up*, so perf doesn't degrade quickly. Covers both **CPU to render/generate/display** the view every user sees, **and bundle size** (more remote sites connecting to the central server in future → smaller bundles download faster and load more reliably; smaller JS also generally means less parse/execute CPU).
- **AI / developer productivity** — a codebase easy for developers *and* AI to understand. Is the proposed pattern easy for AI to evaluate? What safeguards, rules, or directions support reliable, bug-free software made fast?
- **Responsiveness** — components designed to be responsive; **tables move to card views on smaller screens.** Target is **tablet** screens (not phones yet), but it should **degrade nicely**, even on phones.

## Out of scope for RnD day (hard constraints)

- Improving performance of the **current** front end (small fixes are unproductive; we need major restructure thinking).
- Backend performance improvements.
- Redoing the **UX** — it should look and feel **close to the current design**. (Explicit example: **don't do a wholesale removal of modals.**)
- **No CSS build by JavaScript at runtime** (i.e. no runtime CSS-in-JS).
- **No server-side rendering.**
- **No native app.**

## Evaluation dimensions

- **Developer / AI ergonomics** — why the evaluated choices fit our team and our AI agents.
- **Dependency requirements** — are deps well-supported and known? How many are needed? Does the design reduce supply-chain risk while still doing the job?
- **Front-end performance on throttled CPU** — is it blazing fast?
- **Bundle size** — is it crazy small?
- **Compatibility** — must recreate an experience similar to today and support similar functionality (e.g. plugins, deployment to Android tablet). How is that done with this stack? What's been evaluated?
- **Demonstration** — presentable in 15 minutes; leave time to collate findings in a digestible format.

## Rebuild criteria — "will this make us build faster?"

More than raw dev time:
- How quickly new developers can contribute.
- How reliably AI-assisted tooling generates correct code.
- How easily a feature built by one team can be understood and extended by another.
- How much time is currently lost working around the existing stack's limitations.

## Performance acceptance targets (concrete)

- **JS bundle size** — how small can we make it (reduced by **X%** vs current implementation)?
- **Core Web Vitals:**
  - **LCP < 2.5 s** on a throttled tablet profile simulating low-bandwidth field conditions.
  - **INP < 200 ms** for common workflows (**receiving, stocktake, dispensing**).
- **App shell loads from cache in < 1 s** on repeat visits (offline-first baseline).
- **No measurable performance regression** on any existing screen **after migration**.

## Mobile responsiveness criteria

- Does the stack provide a sufficient **layout primitive** for both **landscape and portrait** across OMS workflow areas without significant custom work?
- Do components behave correctly on **touch input** (tap, scroll, swipe) **without extra touch-handling libraries**?
- Can **data-dense tables** realistically be made usable at tablet breakpoints? Do **frozen columns, column prioritisation, and horizontal scroll** work correctly on touch devices?
- Does the stack support **orientation-aware layouts** where workflows genuinely need different layouts in landscape vs portrait?
- Are **48px touch targets** achievable within the component system **without overriding default sizing throughout**?

## Other capability requirements

- **Navigation** — supports OMS's URL structure, **route-based code splitting**, and correct **offline behaviour** without significant custom work?
- **Tables** — handle OMS's most demanding cases (large datasets, **editable cells**, filtering, sorting, **frozen columns**, **column resizing**, **keyboard navigation**, pagination) on benchmark hardware without degradation. Concretely: **can it render X rows without lagging on a Lenovo M10 gen2 tablet?**
- **JSONForms** — used for program modules today (e.g. HIV treatment, TB case management); complex, deployment-specific structured data entry configured rather than custom-built. There are **61 custom renderers** (DecisionTree, EncounterLineChart, PatientSearch, BloodPressure, BMI, IdGenerator, …) that **reference MUI components directly** right now.
- **Accessibility** — must comply with **WCAG 2.2**. Material React Table gives **keyboard row navigation** and **screen-reader announcements for sort-state changes** out of the box. Will alternative libraries let us meet these requirements **without too much manual implementation**?
- **Themes** — does the theming model support the **full TMF token set**, can it be **scoped** where needed, and is it **simple enough for designers and implementers**?
- **Plugins** — are existing plugins compatible with the new stack? What's the migration effort?
- **Translations & RTL** — handle all current localisation: **pluralisation, formatting, namespaces, fallbacks, RTL**.
- **Custom components** —
  - **Date picker:** pick **year + month only**; also **date range** and **valid windows** (e.g. future-dates-only).
  - **Command-K** handling.
  - **Keyboard-shortcut** support.
- **Interaction layer** — does the stack require building interaction details **from scratch** that a more opinionated library would have given out of the box?
- **GraphQL** — continuing with GraphQL; **caching & refetch** would be good to retain.
- **Bundling** — **code-splitting to isolate bundles to functional areas.**

---

## Reconciliation notes (Claude — not the dev lead, not Carl's decisions)

How the dev lead's spec lines up with what we've already recorded. Use these to decide what to ratify, what to revisit, and what to demonstrate.

**Where the spec reinforces our existing direction**
- **"No CSS build by JavaScript at runtime"** hardens Carl's *avoid runtime CSS-in-JS* preference into an **external hard constraint**. It rules out emotion-style runtime CSS-in-JS but leaves CSS Modules, vanilla-extract (zero-runtime), and Tailwind all on the table — see the deferred styling decision in [`DECISIONS.md`](./DECISIONS.md).
- **"Look/feel close to current," "don't remove modals wholesale," and "no regression on existing screens *after migration*"** fit our build strategy: a **new** front-end grown **feature-by-feature**, with the current app as the behavioural reference (see `DECISIONS.md`, 2026-07-01). Greenfield and incremental are both true here.
- The **performance + bundle** focus and the **AI/developer-productivity** focus map directly onto Carl's simpler-UI thesis and the "TypeScript makes AI safer" argument in [`ARGUMENTS.md`](./ARGUMENTS.md). (Note: the spec does **not** itself mandate TypeScript — that remains Carl's argument to make.)

**Where the spec adds cost/risk to weigh against recorded decisions**
- **Accessibility vs. headless tables.** The spec sets an explicit bar — MRT's keyboard row nav + sort-state screen-reader announcements — and asks whether alternatives meet **WCAG 2.2** *without too much manual implementation*. Our lean toward **TanStack Table (headless)** means we **own** that a11y work. This is a real validation item for the table decision, not a settled win.
- **MUI removal has a long tail.** Dropping MUI implies migrating **61 JSONForms custom renderers that reference MUI directly**, plus **plugin** compatibility. The prototype should at least show a credible *path* for these, since "compatibility" is an explicit evaluation dimension.

**Scope the spec promotes from Carl's "consciously deferred" list**
- The prototype deferred i18n/RTL, multi-platform, and offline/sync. The spec treats **responsiveness/tablet** (tables→cards, 48px touch targets, orientation-aware layouts), **accessibility (WCAG 2.2)**, **theming (TMF tokens)**, and **RTL** as evaluation criteria — i.e. the RnD must at minimum **demonstrate how the chosen stack supports them**, even if not fully built in the slice.

**Concrete success metrics to adopt for the prototype**
- LCP < 2.5 s and INP < 200 ms (receiving/stocktake/dispensing) on a throttled tablet profile; app shell < 1 s from cache; bundle reduced vs current; benchmark table rendering on a **Lenovo M10 gen2**. These give the demo measurable pass/fail targets instead of vibes.

**Greenfield + incremental — settled, not a tension**
- The spec's **"greenfield rebuild"** framing and the founding doc's **incremental, no-big-bang** stance are the same plan: **start a new front-end app and grow it feature-by-feature**, using the current codebase as the behavioural reference. The new app is the greenfield part; building it one shippable feature at a time is the incremental part. Recorded in `DECISIONS.md` (2026-07-01).
