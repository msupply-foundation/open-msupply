import { t } from '../../../intl';
import type { StatusStep } from '../../../ui/elements/feedback/StatusIndicator';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

// The detail-screen editability boundary (rules › editability): an order is
// editable only while Draft AND its supplier's store is enabled. Every edit
// affordance on the screen (header fields, MOS selects, line delete, send)
// shares this one gate; a non-editable order renders the same content
// read-only. The server enforces the same regardless.
export const isOrderEditable = (node: InternalOrderInfoFragment): boolean =>
  node.status === 'DRAFT' && !node.otherParty.store?.isDisabled;

// The empty-send refusal (AC-S4; rules › Lifecycle; D20): an order with no
// lines is never sendable; an all-zero order is sendable only where the store
// keeps zero-requested lines on send
// (keepRequisitionLinesWithZeroRequestedQuantityOnFinalised) — its lines
// survive the send. The all-zero test scans the loaded lines — currently the
// full set, since the lines ride the nested connection (see
// internalOrderDetail.graphql's server-pagination note); it becomes a server
// count when that gap closes.
export const isEmptySend = (
  lines: { requestedQuantity: number }[],
  keepZeroLines: boolean
): boolean => {
  if (lines.length === 0) return true;
  if (keepZeroLines) return false;
  return !lines.some(line => line.requestedQuantity > 0);
};

// The lifecycle trail shown in the footer StatusIndicator: DRAFT → SENT →
// FINALISED (README › status; NEW is response-side only and never appears on a
// request requisition). Each stage stamped with its date.
export const statusSteps = (node: InternalOrderInfoFragment): StatusStep[] => [
  { label: t('label.draft'), date: node.createdDatetime },
  { label: t('label.sent'), date: node.sentDatetime },
  { label: t('label.finalised'), date: node.finalisedDatetime },
];

// Index of the order's current stage in the trail above.
export const currentStatusStep = (
  status: InternalOrderInfoFragment['status']
): number => {
  switch (status) {
    case 'FINALISED':
      return 2;
    case 'SENT':
      return 1;
    // DRAFT — and the response-only NEW, defensively — are the first stage.
    default:
      return 0;
  }
};
