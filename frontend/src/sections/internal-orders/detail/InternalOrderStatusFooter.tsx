import { createSignal, Show, Switch, Match, type Component } from 'solid-js';
import { t, tPlural } from '../../../intl';
import { authUser, userDisplayName } from '../../../auth/authContext';
import { Button } from '../../../ui/elements/buttons/Button';
import {
  CancelButton,
  OkButton,
} from '../../../ui/elements/buttons/StandardButtons';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { CheckIcon } from '../../../ui/icons';
import { sendInternalOrder } from './internalOrderUpdate';
import {
  currentStatusStep,
  isEmptySend,
  statusSteps,
} from './internalOrderDetailStatus';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

// The detail footer (spec/internal-orders S3 § footer): the status trail
// (Draft → Sent → Finalised, each stamped with its date) and the one status
// action — Confirm Sent.
//
// Confirm Sent is hidden on a read-only order (AC-S3). A send that would
// produce an empty order is refused client-side with an explanation and no
// call (AC-S4): no lines at all, or — where the store trims zero-requested
// lines on send — no non-zero-requested line. Where the store keeps
// zero-requested lines (keepRequisitionLinesWithZeroRequestedQuantityOn-
// Finalised), an all-zero order is sendable — its lines survive the send
// (rules › Lifecycle, D20). Otherwise it confirms before sending. The server's
// domain refusals (the reasons backstop, the emergency cap, cannot-edit) come
// back typed and surface inline in the dialog (contract › lifecycle). A missing
// RequisitionSend permission routes to the global permission-denied modal
// (graphqlFetch default). Where the store requires supplier authorisation and
// the order carries no comment, the send stamps a generated approval note
// identifying the sender (AC-S7, buildSendAutoComment) on the same save; the
// server neither writes nor requires it (contract › lifecycle).
type Phase = 'confirm' | 'empty' | 'sending' | 'error';

// AC-S7: the send auto-comment. When the store requires supplier authorisation
// and the order has no comment yet, build the approval note from the sending
// user's identity (name, job title, email, phone — the latter two dashed when
// unknown, matching the reference). Returns undefined when nothing should be
// stamped — authorisation off, or the order already carries a comment (kept) —
// so the send omits `comment` and leaves any existing one untouched.
const buildSendAutoComment = (
  requiresAuthorisation: boolean,
  existingComment: string | null | undefined
): string | undefined => {
  if (!requiresAuthorisation) return undefined;
  if (existingComment && existingComment.trim()) return undefined;
  const u = authUser();
  const job = u?.jobTitle ? ` (${u.jobTitle})` : '';
  return t('template.requisition-sent', {
    name: userDisplayName(),
    job,
    email: u?.email ?? '-',
    phone: u?.phoneNumber ?? '-',
  });
};

export interface InternalOrderStatusFooterProps {
  storeId: string;
  node: InternalOrderInfoFragment;
  /** The standing editability gate (Draft + supplier store enabled). */
  editable: boolean;
  /**
   * The store requires supplier authorisation of internal orders — gates the
   * send auto-comment stamping (AC-S7).
   */
  requiresAuthorisation: boolean;
  /**
   * The store keeps zero-requested lines on send
   * (keepRequisitionLinesWithZeroRequestedQuantityOnFinalised) — an all-zero
   * order is then sendable (AC-S4, D20).
   */
  keepZeroLines: boolean;
  /** A send succeeded — merge the returned node over the current one. */
  onSent: (node: InternalOrderInfoFragment) => void;
  /**
   * The lines a reasons-backstop refusal named (AC-R3), so the detail can flag
   * their Reason cells; called with [] on any other outcome to clear stale
   * flags.
   */
  onReasonsNotProvided: (lineIds: string[]) => void;
}

export const InternalOrderStatusFooter: Component<
  InternalOrderStatusFooterProps
> = props => {
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const emptySend = () =>
    isEmptySend(props.node.lines.nodes, props.keepZeroLines);

  // Outstanding-ancillary send warning (AC-A9): alert-styled, never blocks the
  // send. The plan is computed server-side and rides the node.
  const ancillaryWarning = () => {
    const ancillary = props.node.ancillaryState;
    if (ancillary.state === 'NEEDS_ADD')
      return tPlural(
        'warning.confirm-send-ancillary-items-missing',
        ancillary.count
      );
    if (ancillary.state === 'NEEDS_UPDATE')
      return tPlural(
        'warning.confirm-send-ancillary-items-stale',
        ancillary.count
      );
    return undefined;
  };

  const onConfirmSend = () => {
    // Empty-order refusal is a client check — no call (AC-S4).
    setPhase(emptySend() ? 'empty' : 'confirm');
    setErrorMessage(undefined);
    setOpen(true);
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('sending');
    const comment = buildSendAutoComment(
      props.requiresAuthorisation,
      props.node.comment
    );
    const result = await sendInternalOrder(
      props.storeId,
      props.node.id,
      comment
    );
    if (result.kind === 'saved') {
      props.onReasonsNotProvided([]);
      props.onSent(result.node);
      setOpen(false);
      return;
    }
    if (result.kind === 'error') {
      // Flag the offending Reason cells (AC-R3); [] for a non-reasons error
      // clears any stale flags from an earlier attempt.
      props.onReasonsNotProvided(result.reasonLineIds);
      setErrorMessage(result.message);
      setPhase('error');
      return;
    }
    // transport/unexpected → global modal already surfaced it; reset dialog.
    setPhase('confirm');
  };

  return (
    <ContentFooter>
      <StatusIndicator
        steps={statusSteps(props.node)}
        current={currentStatusStep(props.node.status)}
      />
      <ContentFooterActions>
        {/* No Close here (D103): leaving the order is the breadcrumb's job, in
            the app bar, where every other screen puts it. */}
        {/* Hidden on a read-only order (AC-S3). */}
        <Show when={props.editable}>
          <Button
            icon={<CheckIcon />}
            data-testid="save-and-confirm-status-button"
            onClick={onConfirmSend}
          >
            {t('button.save-and-confirm-status', { status: t('label.sent') })}
          </Button>
        </Show>
      </ContentFooterActions>

      <Show when={open()}>
        <Dialog
          open
          dismissable={phase() !== 'sending'}
          onClose={() => setOpen(false)}
          testId="confirmation-modal"
          title={t('heading.are-you-sure')}
          description={
            <Switch
              fallback={
                <>
                  {/* Outstanding-ancillary warning above the confirm prompt;
                      confirming still sends (AC-A9). */}
                  <Show when={ancillaryWarning()}>
                    <Alert severity="warning">{ancillaryWarning()}</Alert>
                  </Show>
                  {t('messages.confirm-status-as', {
                    status: t('label.sent'),
                  })}
                </>
              }
            >
              <Match when={phase() === 'empty'}>
                <Alert severity="warning" testId="send-error">
                  {t('messages.cant-send-order')}
                </Alert>
              </Match>
              <Match when={phase() === 'error'}>
                <Alert severity="error" testId="send-error">
                  {errorMessage()}
                </Alert>
              </Match>
            </Switch>
          }
          actions={
            <Switch
              fallback={
                // confirm / sending: Cancel (hidden while sending) + the
                // loading confirm.
                <>
                  <Show when={phase() === 'confirm'}>
                    <CancelButton onClick={() => setOpen(false)} />
                  </Show>
                  <OkButton
                    data-testid="confirmation-modal-ok"
                    loading={phase() === 'sending'}
                    onClick={() => void run()}
                  />
                </>
              }
            >
              {/* empty / error: nothing to submit — a single Close. */}
              <Match when={phase() === 'empty' || phase() === 'error'}>
                <Button
                  variant="secondary"
                  confirms="plain"
                  onClick={() => setOpen(false)}
                >
                  {t('button.close')}
                </Button>
              </Match>
            </Switch>
          }
        />
      </Show>
    </ContentFooter>
  );
};
