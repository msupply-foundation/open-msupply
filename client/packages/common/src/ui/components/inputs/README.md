## common/ui/components/inputs

### Overview

Components for inputting data - TextArea, DatePickers etc.

### Intentions

The intention is that each style of input (Checkbox, Switch, TextInput etc) has a submodule which will hold any stories, tests and variants of the input.

An 'input' is a little vague, however if the component is for the user to enter data (i.e. through some text) rather than triggering an action (i.e. a button is 'inputting' a click) then the component probably belongs here.

By colacting inputs, the hope is that whenever an input is needed, checking this folder will let you know if it's built yet or not.

Additionally, having a story for each input & variant should give users a good idea of an inputs functionality, look and feel.

### Tips & Things to keep in mind

- It's often easier to create a component for a concrete use case rather than modifying an existing one. I.e. trying to manage currencies in a `TextInput` is a lot of work, a specific component can help with that.
- Creating a 'BaseX' component to extend might seem excessive, but it will usually result in the next variant being a lot easier to make.
- Things to keep in mind for creating inputs:
  - Disabling
  - Forwarding refs, focus and tabbing
  - varying widths and margins etc with labels.
  - RTL Support.
  - An uncontrolled component can be more performant - however, it brings a lot of other complexities so sticking with controlled where you can is often a good idea.

### Future considerations
