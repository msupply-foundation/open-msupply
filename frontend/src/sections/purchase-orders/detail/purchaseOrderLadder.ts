import { t } from '@/intl';
import {
  PO_STATUSES,
  poStatusLabel,
  type PurchaseOrderStatus,
} from '../purchaseOrderStatus';
import type { PurchaseOrderInfoFragment } from './purchaseOrderDetail.generated';

// The state ladder as an order's own screen presents it, and every editability
// gate the screen mirrors (spec/purchase-orders rules § an order's own screen,
// § the status lifecycle). Pure — no components, no GraphQL — so the rules that
// decide what a user may touch are covered by node vitest directly rather than
// through a rendered screen.
//
// Mirroring is not belt-and-braces here, it is the only enforcement the user
// ever sees: a field edit the domain refuses comes back as an untyped
// `Bad user input` with no discriminator (contract ⚠️ the refusal to edit a
// closed order is declared nowhere), so a control this module leaves enabled
// on a closed order would fail into a toast naming no cause. Two of the
// lifecycle's own gates are likewise front-end-only (contract ⚠️ two of the
// lifecycle's gates exist only in the front end).

/**
 * The ladder in order, with the approval state present only where it exists.
 */
export const ladderFor = (
  authorisationRequired: boolean
): PurchaseOrderStatus[] =>
  authorisationRequired
    ? PO_STATUSES
    : PO_STATUSES.filter(status => status !== 'REQUEST_APPROVAL');

/**
 * The one state the screen offers to move to: the next rung up, or none at all
 * on a Finalised order. Only the next state can be chosen — every other rung
 * is shown but unreachable (rules § the status lifecycle).
 *
 * A status OFF the ladder (an order sitting in REQUEST_APPROVAL in a store that
 * no longer requires authorisation, which nothing prevents — the domain
 * enforces no ordering at all) resolves to the rung above the one it would
 * occupy, so such an order is never stranded with no move.
 */
export const nextStatus = (
  status: PurchaseOrderStatus,
  authorisationRequired: boolean
): PurchaseOrderStatus | undefined => {
  const ladder = ladderFor(authorisationRequired);
  const index = ladder.indexOf(status);
  if (index >= 0) return ladder[index + 1];
  // Off-ladder: fall back to the full ladder's ordering and take the first
  // rung above it that this store actually offers.
  const full = PO_STATUSES.indexOf(status);
  return ladder.find(rung => PO_STATUSES.indexOf(rung) > full);
};

/** Which rung the order is on, for the footer indicator's `current`. */
export const currentStep = (
  status: PurchaseOrderStatus,
  authorisationRequired: boolean
): number => {
  const ladder = ladderFor(authorisationRequired);
  const index = ladder.indexOf(status);
  if (index >= 0) return index;
  // Off-ladder (see nextStatus): read as the last rung at or below it, so the
  // indicator shows progress rather than snapping back to the start.
  const full = PO_STATUSES.indexOf(status);
  const reached = ladder.filter(rung => PO_STATUSES.indexOf(rung) <= full);
  return Math.max(0, reached.length - 1);
};

/**
 * The moment a state was entered, or undefined where it has not been. New's
 * moment is the order's creation moment; a state's moment is stored
 * independently of the state itself, so a moment can be present on an order
 * that has since moved backwards (rules § the state ladder).
 *
 * The SENT moment is the exception the spec calls out: it is presented on the
 * ladder only while the order is Sent or Finalised, although an order may carry
 * one in any state — the side panel offers that date for editing directly, so
 * showing it on the ladder of a New order would read as a state it never
 * reached.
 */
export const statusMoment = (
  node: Pick<
    PurchaseOrderInfoFragment,
    | 'status'
    | 'createdDatetime'
    | 'requestApprovalDatetime'
    | 'confirmedDatetime'
    | 'sentDatetime'
    | 'finalisedDatetime'
  >,
  status: PurchaseOrderStatus
): string | undefined => {
  switch (status) {
    case 'NEW':
      return node.createdDatetime ?? undefined;
    case 'REQUEST_APPROVAL':
      return node.requestApprovalDatetime ?? undefined;
    case 'CONFIRMED':
      return node.confirmedDatetime ?? undefined;
    case 'SENT':
      return node.status === 'SENT' || node.status === 'FINALISED'
        ? (node.sentDatetime ?? undefined)
        : undefined;
    case 'FINALISED':
      return node.finalisedDatetime ?? undefined;
  }
};

// ─── Editability ────────────────────────────────────────────────────────────

/** New, Ready for approval or Ready for sending — the authoring window. */
export const isOpenToChange = (status: PurchaseOrderStatus): boolean =>
  status === 'NEW' || status === 'REQUEST_APPROVAL' || status === 'CONFIRMED';

/** New or Ready for approval — the drafting window. */
export const isDrafting = (status: PurchaseOrderStatus): boolean =>
  status === 'NEW' || status === 'REQUEST_APPROVAL';

/**
 * The contract-signed and advance-paid dates record what happens AFTER
 * sending, so they stay open on a Sent order and close only once it is
 * Finalised (rules § what may be changed, and when).
 */
export const canRecordPostSendingDates = (
  status: PurchaseOrderStatus
): boolean => status !== 'FINALISED';

/**
 * The sent date may be entered by hand in every state before Sent; from then
 * on the panel reads it, and entering Sent stamps the actual moment over it.
 */
export const canEnterSentDate = (status: PurchaseOrderStatus): boolean =>
  isOpenToChange(status);

/**
 * Whether the currency may be changed. NOT a state rule: an order carrying a
 * confirmation moment has its currency fixed whatever state it is in, and an
 * order in a late state without one can still have it changed (rules § what
 * may be changed, and when). The exchange rate follows the currency and is
 * never editable on its own.
 */
export const canChangeCurrency = (
  node: Pick<PurchaseOrderInfoFragment, 'status' | 'confirmedDatetime'>
): boolean =>
  isOpenToChange(node.status as PurchaseOrderStatus) && !node.confirmedDatetime;

/**
 * Lines may be removed, and their delivery dates set in bulk, while drafting.
 */
export const canAuthorLines = isDrafting;

/** Lines may be closed for receipt on a Sent order, and only there. */
export const canCloseLines = (status: PurchaseOrderStatus): boolean =>
  status === 'SENT';

/** The order may be deleted while drafting, on the list's terms. */
export const canDelete = isDrafting;

/** Attachments may be added and removed until the order is Sent. */
export const canAttachDocuments = isOpenToChange;

// ─── The two front-end-only lifecycle gates ─────────────────────────────────

/**
 * Why a state move is declined before it is ever attempted, or undefined when
 * nothing here blocks it. Both refusals are the surface's alone — neither is in
 * the service, so neither survives a caller that does not reimplement them
 * (contract ⚠️) — and neither raises the confirmation dialog: they are reported
 * in place at the control (spec S18).
 *
 * `emptyLines` is "the order has no lines, or any line carries no quantity".
 * The caller counts that over the WHOLE line set, not the visible page: the
 * table is server-paginated, so a page can be clean while a later one is not.
 */
export const moveRefusal = (options: {
  target: PurchaseOrderStatus;
  authorisationRequired: boolean;
  canAuthorise: boolean;
  lineCount: number;
  emptyLineCount: number;
}): string | undefined => {
  if (options.lineCount === 0 || options.emptyLineCount > 0)
    return t('messages.cannot-change-status-purchase-order-placeholder-lines');
  if (
    options.target === 'CONFIRMED' &&
    options.authorisationRequired &&
    !options.canAuthorise
  )
    return t('error.no-purchase-order-authorisation-permission');
  return undefined;
};

/**
 * The confirmation a move raises (spec S18). Finalising warns that it cannot be
 * undone — and warns differently while stock is still owed, since finalising
 * closes every line for receipt — and carries its own confirm label; every
 * other move asks the plain question.
 *
 * The question interpolates the state's LABEL, not its stored value: this
 * repo's `messages.confirm-status-as` reads `Confirm status as {{status}}?`
 * with no nested translation, so passing the raw enum would put "CONFIRMED" in
 * front of the user (README § one piece of copy has drifted).
 */
export const moveConfirmation = (
  target: PurchaseOrderStatus,
  stockStillOwed: boolean
): { message: string; note?: string; confirmLabel?: string } => {
  if (target === 'FINALISED')
    return {
      message: stockStillOwed
        ? t('messages.purchase-order-outstanding-lines')
        : t('messages.purchase-order-finalise-warning'),
      confirmLabel: t('button.finalise-anyway'),
    };
  return {
    message: t('messages.confirm-status-as', { status: poStatusLabel(target) }),
    note:
      target === 'CONFIRMED'
        ? t('messages.purchase-order-ready-to-send')
        : undefined,
  };
};
