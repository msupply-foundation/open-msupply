## common/types

### Overview

Common utility types & GQL generated types.

### Intentions

General types & common utilities used in multiple places:

For example, a useful type which ensures there is always at least one value:

`type AlwaysHasAtLeastOne<T> = [T, ...T[]]`

However, a type:

`type Item { .. }`

Would probably be more useful in `@common/system`, colocated with the `Item` domain objects related components

### Tips & Things to keep in mind

### Future considerations

- It's possible and probably a good idea that we split at least some of the GQL generated schema up into the packages which utilise those types.
