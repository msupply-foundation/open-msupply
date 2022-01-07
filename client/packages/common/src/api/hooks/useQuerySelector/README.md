## common/api/hooks/useQuerySelector

### Overview

Selector utility hook for react-query.

### Intention

The intention is to simplify making selector hooks for selecting subsets of data from a react-query useQuery hook.

### Tips & Things to think about

- Memoise the selector function to ensure a stable reference which won't need to re-run until the data has changed.
- Rather than using a useQuery to request some entity and passing the entity down, it is often more performant to use multiple selector hooks closer to where the data is used.

### Future considerations

- Might be useful to add the useQueryOptions to pass through
