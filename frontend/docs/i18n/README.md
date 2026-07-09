# Front-end internationalisation (i18n)

Design docs for adding i18n to the SolidJS `open-msupply-frontend`, satisfying most of the
functionality of the existing open mSupply React app **without** its heavyweight i18next stack.

Open the HTML files in a browser (they are self-contained — no build step).

| Document | What it is |
|---|---|
| [analysis.html](./analysis.html) | What the existing i18n subsystem does, ranked by real usage, and the gap between `@solid-primitives/i18n` and our needs. |
| [decision.html](./decision.html) | KDD — the decision to adopt `@solid-primitives/i18n` as the core and hand-roll the gap layer (i18next and full hand-roll considered). |
| [implementation-plan.html](./implementation-plan.html) | Concrete plan for the `src/intl` module: primitive core plus hand-rolled plurals, namespaces, caching, server overrides, detection, and formatting. |

## Decision in one line

Adopt **`@solid-primitives/i18n`** for the translation core (~99% of usage, +~0.5 KB gzip, signal-native
reactivity) and **hand-roll the bounded gap** — plurals (`Intl.PluralRules`), namespaces, lazy loading +
localStorage cache with `LANG_VERSION` busting, live `custom-translations`, detection, and locale-aware
number/date/RTL formatting — rather than pull in i18next (+13.6 KB gzip, ~69% of the app, no SolidJS binding).

**Out of scope:** currency (already a manual import), MUI / Material-React-Table locales (not used), and
the `<Trans>` rich-JSX component.

The byte measurements behind this are from a production Webpack build of this project; see `analysis.html`
for the methodology.
