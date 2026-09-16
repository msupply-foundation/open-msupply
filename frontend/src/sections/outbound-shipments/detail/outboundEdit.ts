import type { DebouncedEdit } from '../../../domain/debouncedEdit';

// The as-you-type editable text fields on a shipment — the toolbar's customer
// reference plus the side panel's comment and transport reference. One
// createDebouncedEdit buffer over this shape is owned by OutboundDetailView
// and passed whole to both children, so a burst of edits coalesces into a
// single updateOutboundShipment (kdd/state-management). Empty strings stand in
// for null fields.
export type OutboundEditFields = {
  theirReference: string;
  comment: string;
  transportReference: string;
};

export type OutboundFieldEdit = DebouncedEdit<OutboundEditFields>;
