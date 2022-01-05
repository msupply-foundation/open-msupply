## common/hooks

### Overview

General use and utility hooks.

### Intentions

Colocation of generic and utility hooks for common state-based features.

### Tips & Things to keep in mind

- Keep in mind that these hooks are for general use. `useToggle` can be used to switch a boolean value, or `useDebounceCallback` can be used to debounce a callback. Hooks which are more suited to a specific domain problem might be better suited elsewhere.
- A story for a hook can be really helpful for visualising what the function does.
- As with components, composing hooks is often a useful strategy. If you're using multiple hook primitive (useState, useEffect etc), see if it makes sense to break the uses into separate custom hooks.


### Future considerations

- Grouping hooks into sub modules might be required once there are a sufficient number of them. I.e. webApi hooks, component hooks, layout hooks etc.
