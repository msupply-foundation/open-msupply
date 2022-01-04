### Overview

Library components!

### Intention

Components that can be used as-is or extended to suit specific use cases. Ideally, whenever needing a component in a domain package, at minimum you can import the base for that component from this module, if not the full component.

### Tips & Things to keep in mind

- We use MUI heavily as the base for components. Where possible, try to utilise a MUI component. Often, if you import a MUI component and style it, that should be all you need.
- Try to break down components and use composition where possible. I.e. a `BaseTextInput` component can be used to make a `NumericTextInput` or a `CurrencyTextInput` 
- You don't need to cover *every* use case, but when making components try to keep these in mind:
  - Disabling
  - Forwarding refs
  - RTL Support

### Gotchas

### Future Considerations




