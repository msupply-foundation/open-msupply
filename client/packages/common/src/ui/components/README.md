## common/ui/components

### Overview

Generic components & widgets.

### Intentions

All components here should be some widget which is generic enough to extend or covers a concrete use case.

### Tips & Things to keep in mind

- When creating a component, if you are covering a concrete use case - i.e. a `SearchBar` component, then basing this from some other generic component (i.e. a `TextInput` is usually very helpful)
- Memoising is usually a good idea. Creating custom equality functions isn't.
- Keep these use cases in mind:
  - Disabling
  - RTL Support
  - Forwarding refs

### Future considerations

