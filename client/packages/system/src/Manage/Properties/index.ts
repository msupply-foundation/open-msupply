// Only the route entry-points are exported from the package barrel. The api
// hooks / generated SDK and utils are imported via relative paths within the
// feature — re-exporting `operations.generated` here would collide with other
// features' `getSdk`/`Sdk` symbols through the system package barrel.
export * from './ListView';
export * from './DetailView';
