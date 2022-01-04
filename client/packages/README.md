### Overview

Contains all of the packages for running the omsupply-client.

Each package is co-located by shared code functionality, not by shared GUI space. For instance, inbound and outbound shipment functionality is within the `invoices` package, as there is shared logic and code between these packages. However, they're located in separate places in the UI.

### Intentions

The intention is that packages have an explicit boundary to ensure bundle sizes are kept minimal by reducing the chance of accidental imports increasing bundle sizes.

The only packages which should be imported by any other package are:
- `@openmsupply-client/common`
- `@openmsupply-client/system`

These are shared libraries for common functionality between each of the packages.

### Gotchas

- Don't import from other packages! For example, if you import something from `invoices` into `requisitions`, the bundle size of `requisitions` could double

### Future considerations

- It is possible that each package could be a microfrontend, enabling packages to be independently deployed
- Probably the `common` package will need to be built independently to tree shake correctly
- If `common` grows too big, splitting it into more packages might have some benefits - i.e. `@openmsupply-client/ui`, `@openmsupply-client/intl`, `@openmsupply-client/utils`
