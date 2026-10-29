+++
title = "common/intl"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

## common/intl

### Overview

Localisation files and helpers for working with translations.

### Intentions

Colocation of all helpers for working with translations & all localisation files.

### Tips & Things to keep in mind

- All runtime translations should be in the `common.json` file for the given language.
- There is also a `desktop.json` file, specifically for the translation of elements required on startup for the Electron desktop app (e.g. for context menu, app menu). These strings are not available in the usual runtime.
- Translations are lazily loaded
- Translations are cached in local storage of the user. If you find your strings aren't being translated, try clearing your local storage.
- We are using weblate to allow collaborative translation, if you are adding entries it is probably easier to use that

## AI-drafted translations (Solid front end)

New keys in `frontend/src/intl/locales/en/` are translated for every shipped language by the `translate` agent skill (`.claude/skills/translate/`), in the same PR or a follow-up. The drafts take each string's usage (column header, button, message …) and the catalog's existing terminology into account, guided by `frontend/src/intl/translation-guides/`: the language team's own glossary where there is one (for French, the PMs' Google Doc, downloaded as-is; download it again to update it), plus a `<locale>.md` with what the glossary doesn't cover. Every drafted key is listed in `frontend/src/intl/ai-drafts.json` so native speakers can find and confirm them in Weblate; remove an entry once it has been reviewed. The skill never changes a human translation or an overlay catalog such as `fr-DJ`; it may only revise its own drafts while they're still listed in `ai-drafts.json`. `frontend/scripts/check-translations.mjs` verifies this.

## Custom Translation Overrides

Custom translations can be configured via a Global preference on OMS Central. These are then exposed via the REST endpoint `YOUR_SERVER_URL/custom-translations`. IntlContext has this endpoint configured as one of it's 'backends'.

IntlStrings uses them via the `CUSTOM_TRANSLATIONS_NAMESPACE` which means custom translations take precedence over our defaults.
