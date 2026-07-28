import type { DebouncedEdit } from '../../../domain/debouncedEdit';

// The as-you-type editable text fields on a supplier return — the toolbar's
// supplier reference plus the side panel's comment and transport reference. One
// createDebouncedEdit buffer over this shape is owned by
// SupplierReturnDetailView and passed whole to the children, so a burst of edits
// coalesces into a single updateSupplierReturn (kdd/state-management). Empty
// strings stand in for null fields; the header patch cannot CLEAR a field back
// to absent — only overwrite (contract § header rules) — so '' is sent as-is.
export type ReturnEditFields = {
  theirReference: string;
  comment: string;
  transportReference: string;
};

export type ReturnFieldEdit = DebouncedEdit<ReturnEditFields>;
