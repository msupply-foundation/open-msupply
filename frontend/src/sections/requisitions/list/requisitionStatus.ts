import { t } from '../../../intl';
import type { RequisitionRowFragment } from './requisitions.generated';

// The requisition lifecycle as it reads on the list: NEW → FINALISED
// (spec/requisitions rules › lifecycle & editability; DRAFT and SENT are
// request-side only and never appear on a response requisition). Each maps to
// a chip label + colour token (tokens.css --status-*), spread straight into
// StatusChip. Meaning is carried by the text, not colour alone (WCAG): NEW is
// the neutral "editable" grey, FINALISED the terminal "done" green.
type Status = RequisitionRowFragment['status'];

export const statusLabel = (status: Status): string =>
  // NEW — and the request-only DRAFT/SENT, defensively — read as New.
  status === 'FINALISED' ? t('status.finalised') : t('status.new');

export const statusColour = (status: Status): string =>
  status === 'FINALISED' ? 'var(--status-finalised)' : 'var(--status-new)';

// Approval status → its catalog label (spec S1 col 10 / OMS-REG-DIST-05.23).
// The value is the requisition's OWN approval state (not a linked copy's);
// NONE is the "no approval recorded" fallback.
type ApprovalStatus = RequisitionRowFragment['approvalStatus'];

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

// The UI's standing approval lock (rules › lifecycle & editability): a pending
// or denied approval presents the requisition read-only — on ANY requisition,
// program or not (the UI is deliberately stricter than the server here,
// captured as-is in the spec).
export const isApprovalBlocked = (row: RequisitionRowFragment): boolean =>
  row.approvalStatus === 'PENDING' ||
  row.approvalStatus === 'DENIED' ||
  row.approvalStatus === 'DENIED_BY_ANOTHER';

// The restricted-row rendering (OMS-REG-DIST-05.21): Finalised and
// approval-blocked rows read as visually restricted. The disabled-customer-
// store lock withholds edits (below) but does NOT restrict the row's
// rendering — rules › list presentation names only these two.
export const isRowRestricted = (row: RequisitionRowFragment): boolean =>
  row.status === 'FINALISED' || isApprovalBlocked(row);

// The full editability boundary as it reaches the list (rules › lifecycle &
// editability): editable only while New, not approval-blocked, and the
// customer's store enabled. Drives the row's colour-tag affordance (picker vs
// read-only dot, OMS-REG-DIST-05.27).
export const isRowEditable = (row: RequisitionRowFragment): boolean =>
  row.status === 'NEW' &&
  !isApprovalBlocked(row) &&
  !row.otherParty.store?.isDisabled;
