## common/ui/components/buttons

### Overview

Buttons buttons and more buttons!

### Intentions

This is a collection of all the buttons used anywhere in the UI. 

The intention is once a button is added somewhere in the UI, no team member should need to recreate that button.

### Tips & Things to keep in mind
- Always try to utilise some sort of `BaseButton` when creating a concrete use case - suprisngly buttons can cover a very wide variety of use cases, so can get complicated quickly. Instead of changing buttons, look at creating a new one from the base to cover the use case.
- For buttons, it's always good to think about:
    - Disabling
    - RTL Support
    - Easy adding of margin/padding (often needed for buttons especially!)


### Future considerations
