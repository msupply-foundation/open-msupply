import type { DebouncedEdit } from '../../../domain/debouncedEdit';

// The as-you-type text fields on an inbound shipment header + side panel
// (reference and comment). One shared debounced buffer, owned by the detail
// view and passed to the toolbar and side panel — one buffer = coalescing
// spans the whole entity (mirrors StocktakeEditFields).
export type InboundEditFields = {
  theirReference: string;
  comment: string;
};

export type InboundFieldEdit = DebouncedEdit<InboundEditFields>;
