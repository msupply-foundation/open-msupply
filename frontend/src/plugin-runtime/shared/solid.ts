// Shared-module facade (vite/sharedModules.ts): an extra build entry whose
// hashed chunk URL the import map hands to plugins as `solid-js`. Being part
// of the same build graph as the app guarantees one Solid instance.
export * from 'solid-js';
