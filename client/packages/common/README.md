### Overview

Contains shared code for all packages to utilise - for example ui components, utils for working with arrays and localisation.

Currently, the submodules within and a brief description. See the module itself for a more comprehensive overview:

#### api

Functionality related to communicating with APIs.

#### hooks

Shared library of utility hooks.

#### intl

Localisation: functions for translating strings and translation files themselves.

#### localStorage

Helpers for working with the `localStorage` api in the browser.

#### styles

Themes and helpers for managing RTL support.

#### types

Generic utility types.

#### ui

omSupply styled generic UI components. Have a look at storybook for a demo & example usage of the various components

#### utils

Generic utilities for working with formatting, arrays, dates as well as common helpers like debouncing or throttling. Get familiar!

### Intention

The intention is that most of the time we'll be working in domain specific packages: invoices or requisitions. However, to ensure wheels aren't reinvented, once one team member has written a function to parse a Date from one format to another, to transform an array into a data structure or work with some Web API - no one should need to reinvent that wheel.

### Gotchas

- Code here might be used by anyone in any package. Changes can therefore potentially affect a lot!
  - Generic - Try to make code here generic enough (but not too much..!) so that it can be extended and utilise for other use cases.
  - Tests - we can try to limit breaking changes by having a lot of tests for this part of the code base
  - Simple & Directed - Try to break the solution down into smaller steps. It's much easier to share code when the steps are broken up. That way, instead of changing the solution, change a step1

### Re Exports

Common external packages are exported in this module and should be imported from this module, i.e. `import { Box } from `@openmsupply-client/common'`.

To find where `Box` is re exported from common, search for `Box` in `index.ts` files, this would help in locating the right place to re export a new component/module you are using from external package

### Future Considerations

- One day, there might be some benefits to breaking this package up into smaller chunks. I.e. `@openmsupply-client/ui`, `@openmsupply-client/utils`
- It could be possible that this package be used for any web app within the omSupply system.
