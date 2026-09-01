import type { DebouncedEdit } from '../../../domain/debouncedEdit';

// The as-you-type editable text fields on a customer return — the toolbar's
// customer reference plus the side panel's comment. One createDebouncedEdit
// buffer over this shape is owned by CustomerReturnDetailView and passed whole
// to both children, so a burst of edits across both coalesces into a single
// updateCustomerReturn (kdd/state-management). Empty strings stand in for null
// fields; the header patch cannot CLEAR a field back to absent — only
// overwrite (contract § header rules) — so '' is sent as-is.
export type ReturnEditFields = {
  theirReference: string;
  comment: string;
};

export type ReturnFieldEdit = DebouncedEdit<ReturnEditFields>;
