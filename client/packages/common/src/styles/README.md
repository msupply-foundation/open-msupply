## common/styles

### Overview

App wide theming, styling solutions and RTL support.

### Intentions

The intention for this module is not to colocate specific styles for components but rather provide the helpers to make styling components easier. Colocating styles with the component itself is usually a good idea for code discoverability and maintenance.

There are several helpers, hooks and contexts which aid in general feature development - i.e. changing alpha for a colour, using media queries or for using the styled-components approach with the `styled` function

### Tips & Things to keep in mind

- With the heavy use of MUI, adjusting the `theme` is often needed, which often involves adjusting the types for the theme using module augmentation. For example, to add a 'color' to a MUI components 'color' prop:

```
declare module '@mui/material/Switch' {
  export interface SwitchPropsColorOverrides {
    gray: true;
  }
}
```
- It is generally rare that you really need to use the theme object directly within your component. Utilising the `sx` prop and `styled` gives access to the theme.
- Styles should be swapped automatically when the app is switched to a language which is read right-to-left. However, if you really need to know, you might be looking for `useRTL` from `@common/intl`

### Future considerations
- More module augmentation and theme customising might result in needing to split the theme out into multiple files to actually see what's going on!
