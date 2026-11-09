import type { DebouncedEdit } from '@/domain/debouncedEdit';

// The as-you-type editable text fields on a stocktake — the toolbar's
// description plus the side panel's counted-by / verified-by / comment. One
// createDebouncedEdit buffer over this shape is owned by StocktakeDetailView
// and passed whole to both children, so a burst of edits across the toolbar AND
// the side panel coalesces into a single updateStocktake
// (kdd/state-management). Empty strings stand in for null fields — the buffer
// holds text; saveFields maps '' back to the input.
export type StocktakeEditFields = {
  description: string;
  countedBy: string;
  verifiedBy: string;
  comment: string;
};

// The buffer type the children receive as a prop. Named alias so the child
// prop types read clearly.
export type StocktakeFieldEdit = DebouncedEdit<StocktakeEditFields>;
