// The linked-order link shown in the list (spec S1 column 4) and the detail
// side panel's Related documents (spec S3): a purchase order links as `PO-<n>`
// (secondary tone), an internal order (requisition) as `IO-<n>` (primary
// tone), toned by kind — the look lives in the shared RecordLink component
// (ui/elements/typography/RecordLink), keyed off `data-kind`. Numbers are
// zero-padded to at least three digits (e.g. PO-011,
// IO-095). Undefined when linked to neither.
type LinkedOrderSource = {
  purchaseOrder?: { id: string; number: number } | null;
  requisition?: { id: string; requisitionNumber: number } | null;
};

export type LinkedOrderKind = 'po' | 'io';
export type LinkedOrder = {
  label: string;
  href: string;
  kind: LinkedOrderKind;
};

const pad = (n: number): string => String(n).padStart(3, '0');

// Per-kind labels — used directly where PO and IO can each appear on their
// own row (the side panel's Related documents).
export const poLabel = (number: number): string => `PO-${pad(number)}`;
export const ioLabel = (number: number): string => `IO-${pad(number)}`;

// The single link for the list cell: a PO takes precedence over a requisition
// (a shipment is one or the other in practice).
export const linkedOrderOf = (
  storeId: string,
  source: LinkedOrderSource
): LinkedOrder | undefined => {
  if (source.purchaseOrder)
    return {
      label: poLabel(source.purchaseOrder.number),
      href: `/${storeId}/replenishment/purchase-order/${source.purchaseOrder.id}`,
      kind: 'po',
    };
  if (source.requisition)
    return {
      label: ioLabel(source.requisition.requisitionNumber),
      href: `/${storeId}/replenishment/internal-order/${source.requisition.id}`,
      kind: 'io',
    };
  return undefined;
};
