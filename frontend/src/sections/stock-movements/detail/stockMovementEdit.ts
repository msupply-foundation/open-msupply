import type { DebouncedEdit } from '@/domain/debouncedEdit';

// The one as-you-type editable field on a stock movement — the side panel's
// comment. A single createDebouncedEdit buffer over this shape is owned by
// StockMovementDetailView (kdd/state-management). An empty string is sent
// as-is: the header patch can only overwrite, never clear back to absent
// (contract § comment).
export type MovementEditFields = {
  comment: string;
};

export type MovementFieldEdit = DebouncedEdit<MovementEditFields>;
