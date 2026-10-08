# Sample custom themes

Ready-to-paste themes for trying the custom-theme feature out. Copy a file's contents into **Settings › Display › Custom theme**, save (the app reloads to apply it), and toggle the switch off to put everything back.

They are deliberately a long way from the built-in TMF orange, so it is obvious at a glance whether a theme actually took effect.

| File                                               | What it is                                                | Covers                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`moh-teal.json`](./moh-teal.json)                 | A health-ministry teal, **light theme only**              | The shorthand form (no `light`/`dark` wrapper), a green-tinted ink so the whole grey scale shifts with it, and the carry-over rule — in dark mode the teal, the blue and the status colours follow, while the built-in dark surfaces stay.                                                                    |
| [`indigo-day-night.json`](./indigo-day-night.json) | A deep indigo with a hand-picked dark counterpart         | Both blocks, every colour role including `border`, and the contrast pick flipping by itself: the hero strapline is white on the light theme's deep indigo and dark on the dark theme's paler one.                                                                                                             |
| [`sunrise-gradient.json`](./sunrise-gradient.json) | A crimson/amber theme with **hand-picked hero gradients** | The `gradient` member on both `brand` (the login hero) and `accent` (the initialisation hero), each a two-colour sweep like the built-in one — orange → deep crimson, and cyan → deep teal. The gradients are the same in light and dark, as the built-in ones are: a hero is brand furniture, not a surface. |

The first two pin no gradient at all, so their heroes are built from the brand colour — that is the common case, and it is why a one-line theme still gets a coherent login screen. Reach for `gradient` when you want a hero the brand alone can't produce: the built-in one runs `#ff8800` → `#e63535`, two hues, neither of them the brand colour.

None of the three pins a `-light`/`-dark` variant or a contrast colour — those always derive. A realistic site theme is a dozen lines, and the focus rings, greys, borders, table rows, card surfaces and disabled states all follow from them.

**Hero ink follows the gradient.** The strapline's colour is chosen against the gradient's last stop — the sweep runs top → bottom and the text is bottom-aligned, so that is the colour it actually sits on. In `sunrise-gradient` that lands white on the deep crimson at 7.9:1, in both themes.

Related:

- [`../CUSTOM_THEMES.md`](../CUSTOM_THEMES.md) — the format reference (every role, every rule).
- [`../CUSTOM_THEME_EXAMPLE.md`](../CUSTOM_THEME_EXAMPLE.md) — an annotated theme, for whoever is writing one.
- [`./system-theme.example.json`](./system-theme.example.json) — the **built-in** palette written in this format. Pasting it should leave the app looking exactly as it did; it is also the fixture behind the fidelity test.
