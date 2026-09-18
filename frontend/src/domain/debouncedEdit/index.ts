// The debounced-edit primitive (kdd/domain-modules): a buffered,
// identity-seeded, per-field debounced edit store for save-as-you-type detail
// views / side panels (no Save button). Not an entity module like the others
// under domain/ — it's the reusable edit-buffer the stocktake description +
// side-panel fields hand-rolled, lifted here for other detail views to reuse.
export {
  createDebouncedEdit,
  type DebouncedEdit,
  type DebouncedEditOptions,
} from './createDebouncedEdit';
