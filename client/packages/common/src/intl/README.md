## common/intl

### Overview

Localisation files and helpers for working with translations.

### Intentions

Colocation of all helpers for working with translations & all localisation files.

### Tips & Things to keep in mind
- Translations are lazily loaded
- Translations are cached in local storage of the user. If you find your strings aren't being translated, try clearing your local storage.
- The `common` translation file is often used in many places. Sticking to the translation file mapping to the UI where you string will be used ensures we're only ever needing to load strings which will be seen by the user.

### Future considerations
- It might be required to ensure localisation files are loaded before rendering. See: https://github.com/i18next/react-i18next/pull/523/files#diff-6cc2a4b04b8f73c37303657262b2e2827c7feabcdda33b3ba5885d06cad99cdcR57
