import { t } from '../../../intl';
import type { InternalOrderRowFragment } from './internalOrders.generated';

// The internal-order lifecycle as it reads on the list: DRAFT → SENT →
// FINALISED (spec/internal-orders README › status; NEW is response-side only
// and never appears on a request requisition). Each maps to a chip label +
// colour token (tokens.css --status-*), spread straight into StatusChip.
// Meaning is carried by the text, not colour alone (WCAG): DRAFT is the neutral
// "new/editable" grey, SENT the in-flight "shipped" tone, FINALISED the
// terminal "done" green.
type Status = InternalOrderRowFragment['status'];

export const statusLabel = (status: Status): string => {
  switch (status) {
    case 'SENT':
      return t('label.sent');
    case 'FINALISED':
      return t('label.finalised');
    // DRAFT — and the response-only NEW, defensively — read as Draft.
    default:
      return t('label.draft');
  }
};

export const statusColour = (status: Status): string => {
  switch (status) {
    case 'SENT':
      return 'var(--status-shipped)';
    case 'FINALISED':
      return 'var(--status-finalised)';
    default:
      return 'var(--status-new)';
  }
};

// Approval status → its catalog label (spec S1 col 11 / AC-L9). The value is
// the requisition's own approvalStatus, read from the linked response
// requisition's copy; NONE is the "no linked copy / no approval recorded"
// fallback.
type ApprovalStatus = InternalOrderRowFragment['approvalStatus'];

export const approvalStatusLabel = (status: ApprovalStatus): string => {
  switch (status) {
    case 'PENDING':
      return t('approval-status.pending');
    case 'APPROVED':
      return t('approval-status.approved');
    case 'DENIED':
      return t('approval-status.denied');
    case 'AUTO_APPROVED':
      return t('approval-status.auto-approved');
    case 'APPROVED_BY_ANOTHER':
      return t('approval-status.approved-by-another');
    case 'DENIED_BY_ANOTHER':
      return t('approval-status.denied-by-another');
    default:
      return t('approval-status.none');
  }
};

// The editability boundary as it reaches the list (rules › editability): an
// order is editable only while Draft AND its supplier's store is enabled.
// Drives the row's colour-tag affordance (picker vs read-only dot, AC-T1) and
// whether it may be bulk-deleted (AC-D3) — the same rejection the server gives.
export const isRowEditable = (row: InternalOrderRowFragment): boolean =>
  row.status === 'DRAFT' && !row.otherParty.store?.isDisabled;
