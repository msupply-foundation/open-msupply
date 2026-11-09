import { t } from '@/intl';
import type { StatusStep } from '@/ui/elements/feedback/StatusIndicator';
import type { RequisitionInfoFragment } from './requisitionDetail.generated';

// The detail-screen editability boundary (rules › lifecycle & editability): a
// requisition is editable only while New, not blocked by approval, and with
// the customer's store enabled. Every edit affordance on the screen (header
// fields, colour, comment) shares this one gate; a non-editable requisition
// renders the same content read-only. The UI presents ANY pending/denied
// approval as read-only — deliberately stricter than the server, which
// rejects edits only on program requisitions (captured as-is in the spec).
export const isApprovalBlocked = (node: RequisitionInfoFragment): boolean =>
  node.approvalStatus === 'PENDING' ||
  node.approvalStatus === 'DENIED' ||
  node.approvalStatus === 'DENIED_BY_ANOTHER';

export const isRequisitionEditable = (
  node: RequisitionInfoFragment
): boolean =>
  node.status === 'NEW' &&
  !isApprovalBlocked(node) &&
  !node.otherParty.store?.isDisabled;

// The lifecycle trail shown in the footer StatusIndicator: NEW → FINALISED
// (rules › lifecycle; DRAFT and SENT are request-side only and never appear on
// a response requisition). Each stage stamped with its date.
export const statusSteps = (node: RequisitionInfoFragment): StatusStep[] => [
  { label: t('status.new'), date: node.createdDatetime },
  { label: t('status.finalised'), date: node.finalisedDatetime },
];

// Index of the requisition's current stage in the trail above.
export const currentStatusStep = (
  status: RequisitionInfoFragment['status']
): number => (status === 'FINALISED' ? 1 : 0);

// Approval status → its catalog label (spec S2 toolbar row). Duplicated from
// the list's helper because each types against its own fragment.
type ApprovalStatus = RequisitionInfoFragment['approvalStatus'];

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
