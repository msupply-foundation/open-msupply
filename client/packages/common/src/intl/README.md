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

## Custom Translation Overrides

Custom translations can be configured via a Global preference on OMS Central. These are then exposed via the rest endpoint `YOUR_SERVER_URL/custom-translations`. IntlContext has this endpoint configured as one of it's 'backends'.

IntlStrings uses them via the `CUSTOM_TRANSLATIONS_NAMESPACE` which means custom translations take precedence over our defaults.
