## common/ui/components/buttons/standard

### Overview

These are the standard 'pill' shape buttons.

### Intentions

Co-location of standard shaped buttons. Rather than trying to make a button to cover every use case with a lot of conditional logic, compose different variants specific to a use case.

### Tips & Things to keep in mind

- Always try to utilise `BaseButton` when creating a concrete use case - surprisingly buttons can cover a very wide variety of use cases, so can get complicated quickly. Instead of changing buttons, look at creating a new one from the base to cover the use case.
- For buttons, it's always good to think about:
  - Disabling
  - RTL Support https://rtlstyling.com/posts/rtl-styling#logical-properties-cheat-sheet
  - Easy adding of margin/padding (often needed for buttons especially!)
  - Async/Promise based callbacks

### Future considerations

- Possibly a `StandardButton` / `Button` facade over all the different variants could be a good idea.
