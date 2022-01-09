## system

### Overview

System Domain

### Intentions

The intention is that this package is responsible for shared system domain features:

- Items
- Names
- Stores
- Stock lines
- Locations

### Tips & Things to keep in mind

### Future considerations

- Location, stock lines and other store data modules are within this package which doesn't make intuitive sense. These modules are cross cutting and are useful to have contained within a shared module. However, it might be useful that these modules are shifted to a 'store' package, rather than 'system'.
