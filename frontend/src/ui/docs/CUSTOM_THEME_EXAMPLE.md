# A custom theme, annotated

This is the theme Open mSupply ships with, written out in the custom-theme format, with notes on what each colour controls. It's a starting point: **copy it, change what you want, and delete every line you don't** — anything you leave out keeps the built-in value.

For the full role list and the rules, see [CUSTOM_THEMES.md](./CUSTOM_THEMES.md). For the same document without the commentary — ready to paste — see [system-theme.example.json](./custom_themes/system-theme.example.json).

> **JSON has no comments.** The blocks below are annotated for reading only. Paste the plain file, or strip the `//` lines first, or the theme won't save.

## The light theme

```jsonc
{
  // Shown above the editor in Settings. Cosmetic — call it whatever you like.
  "name": "Open mSupply (system default)",

  // Colours for the normal (light) theme. Leave out the "light"/"dark"
  // wrappers entirely and whatever you write is taken as the light theme.
  "light": {
    "brand": {
      // Your identity colour. It is NOT the button colour (see "accent"):
      // it marks the selected item in the navigation menu, the underline
      // under the active tab, the bar along the bottom of the app, and
      // destructive buttons.
      "base": "#e95c30",

      // Hover/pressed shade of anything filled with the brand colour.
      // Normally derived from "base" — pinned here only because the built-in
      // orange was hand-picked rather than stepped, so the derived shade
      // lands a fraction off it.
      "dark": "#c43c11",

      // The hero panel on the login page: [start, end], drawn top-left to
      // bottom-right. Leave it out and it's built from your brand colour.
      "gradient": ["#ff8800", "#e63535"]
    },

    "accent": {
      // The "do something" colour, and the one most people mean by "the
      // button colour": filled primary buttons, text buttons, the glow
      // around the field you're typing in, info messages, and the
      // "Allocated" status.
      "base": "#3e7bfa",

      // The hero panel on the initialisation screen (first-run setup),
      // which is deliberately a different colour from the login screen.
      "gradient": ["#78a3fc", "#3e7bfa"]
    },

    "danger": {
      // Errors: error messages, the outline and glow on a field that
      // failed validation, "Cancelled" status. (Destructive buttons are
      // brand-coloured, not this — see "brand" above.)
      "base": "#e63535",

      // The pale fill behind an error message. Derived if omitted.
      "background": "#ffcdce"
    },

    "warning": {
      // Caution, inline: warning text under a field, the amber tint on a
      // flagged table row, "Picked" status.
      "base": "#f2a001",

      // The warning message panel specifically. Defaults to "base" — it's
      // separate here only because the two have always been different
      // shades. If you only want one amber, write "warning": "#f2a001".
      "alert": "#ed6c02"
    },

    // Success messages, and the "Verified"/"Finalised" statuses (both of
    // which are overridden below, so this only colours the messages).
    "success": "#2e7d32",

    // The page background — and, from it, every other surface in the app:
    // the navigation drawer, menus, toolbars, table headers and striped
    // rows, cards, input fills and disabled fills are all worked out from
    // this one colour and the text colour below. If you need a specific
    // one of those, "surface" also takes an object; see CUSTOM_THEMES.md.
    "surface": "#ffffff",

    "text": {
      // Normal text.
      "body": "#1c1c28",

      // Secondary text — captions, helper text under fields, placeholder
      // text. This one does more than it looks: every grey in the app
      // (icons, borders, dividers, field outlines, disabled text) is mixed
      // between the page colour and this one, so it sets the whole app's
      // grey character. Worth setting if you set "body".
      "muted": "#555770"
    },

    // Status chips and dots on shipments, requisitions and prescriptions.
    // Only list the ones you want to change. "New", "Allocated", "Picked"
    // and "Cancelled" are left out here because they automatically follow
    // the greys, accent, warning and danger colours above.
    "status": {
      "shipped": "#1fb6b6",
      "delivered": "#7c5cff",
      "received": "#5c86ff",
      "verified": "#38a169",
      "finalised": "#38a169"
    }
  },
```

## The dark theme

Continuing the same document. This half is optional: leave it out and dark mode keeps the built-in dark colours — except your brand, accent and status colours, which follow you into dark mode automatically. Page and text colours never do, since a white page colour would be unreadable there.

The roles are exactly the same; only the values change.

```jsonc
  "dark": {
    // The brand orange is bright enough to work on a dark background, so
    // it's unchanged — and the login hero is the same in both themes.
    "brand": { "base": "#e95c30", "gradient": ["#ff8800", "#e63535"] },

    // Colours generally need lifting for dark mode: this blue is a step
    // lighter than the light theme's, so it still reads against a dark
    // page. The same goes for the danger, warning and success colours.
    "accent": {
      "base": "#5b8def",
      "dark": "#4a7ce8",
      "gradient": ["#78a3fc", "#3e7bfa"]
    },

    "danger": { "base": "#ff5f5f", "background": "#4a1f22" },
    "warning": { "base": "#ffb020", "alert": "#ff8f33" },
    "success": "#4caf50",

    // The dark page colour. Everything else inverts sensibly from it:
    // the navigation drawer and toolbars go darker than the page, while
    // things that float above it — dialogs, popup menus, cards — go
    // lighter, because on a dark background it's lightness, not shadow,
    // that makes something look raised. That all follows from this one
    // colour; you don't have to work it out.
    "surface": "#21212b",

    // Soft off-white rather than pure white — pure white on a dark page
    // is harsh to read for long.
    "text": { "body": "#ececf2", "muted": "#a8a9bd" },

    "status": {
      "shipped": "#2ecbcb",
      "delivered": "#9678ff",
      "received": "#7a9dff",
      "verified": "#48c78e",
      "finalised": "#48c78e"
    }
  }
}
```

## If that looks like a lot

It is the full case. The theme most sites actually want is one line:

```json
{ "brand": "#0b6e99" }
```

That recolours the navigation highlight, the active tab, the footer bar and the login hero to your colour, in both light and dark mode, and leaves everything else alone. A common second line is `"accent"`, which moves the buttons.

Everything above that the built-in theme had to spell out — the pinned `brand.dark`, the two gradients, `danger.background`, the five statuses — is there only because the built-in palette is full of hand-picked exceptions. Your theme probably isn't.

## Rules worth knowing

- **Anything you leave out keeps its built-in value.** There is no need to write a complete theme, and a colour you don't mention will not shift.
- **Every colour is a hex code** like `#0b6e99` (or `rgb()` / `hsl()` if you prefer). Three-digit hex like `#fff` works.
- **A role can be a single colour or an object.** `"brand": "#0b6e99"` and `"brand": { "base": "#0b6e99" }` mean the same thing; use the object form when you want to pin a specific part of it.
- **You'll be told what's wrong.** Saving reports anything unrecognised, any colour it couldn't read, and any combination that fails accessibility contrast — the theme still saves, minus the parts it couldn't use. Only a document it can't use _at all_ is refused.
- **To see it, save it.** Saving reloads the app with the theme applied. Turning the Custom theme switch off puts everything back immediately, so it's safe to experiment.
