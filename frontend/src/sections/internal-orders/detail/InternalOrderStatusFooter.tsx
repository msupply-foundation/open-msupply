import { createSignal, Show, Switch, Match, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t, tPlural } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { CheckIcon, XCircleIcon } from '../../../ui/icons';
import { sendInternalOrder } from './internalOrderUpdate';
import {
  currentStatusStep,
  statusSteps,
} from './internalOrderDetailStatus';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

// The detail footer (spec/internal-orders S3 § footer): the status trail
// (Draft → Sent → Finalised, each stamped with its date) and the one status
// action — Confirm Sent.
//
// Confirm Sent is hidden on a read-only order (AC-S3). When invoked on an order
// with no non-zero-requested line it is refused client-side with an explanation
// and no call (AC-S4); otherwise it confirms before sending. The server's
// domain refusals (the reasons backstop, the emergency cap, cannot-edit) come
// back typed and surface inline in the dialog (contract › lifecycle). A missing
// RequisitionSend permission routes to the global permission-denied modal
// (graphqlFetch default). Auth-comment stamping (AC-S7) is deferred — the
// client's user fragment carries no job title / email / phone to build it, and
// the server neither writes nor requires it (contract › lifecycle).
type Phase = 'confirm' | 'empty' | 'sending' | 'error';

export interface InternalOrderStatusFooterProps {
  storeId: string;
  node: InternalOrderInfoFragment;
  /** The standing editability gate (Draft + supplier store enabled). */
  editable: boolean;
  /** A send succeeded — merge the returned node over the current one. */
  onSent: (node: InternalOrderInfoFragment) => void;
}

export const InternalOrderStatusFooter: Component<
  InternalOrderStatusFooterProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const hasSendableLine = () =>
    props.node.lines.nodes.some(line => line.requestedQuantity > 0);

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
    setPhase(hasSendableLine() ? 'confirm' : 'empty');
    setErrorMessage(undefined);
    setOpen(true);
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('sending');
    const result = await sendInternalOrder(props.storeId, props.node.id);
    if (result.kind === 'saved') {
      props.onSent(result.node);
      setOpen(false);
      return;
    }
    if (result.kind === 'error') {
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
        <Button
          variant="secondary"
          icon={<XCircleIcon />}
          data-testid="close-button"
          onClick={() =>
            navigate(`/${params.storeId}/replenishment/internal-order`)
          }
        >
          {t('button.close')}
        </Button>
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
                <Alert severity="warning">{t('messages.cant-send-order')}</Alert>
              </Match>
              <Match when={phase() === 'error'}>
                <Alert severity="error">{errorMessage()}</Alert>
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
                    <Button
                      variant="secondary"
                      icon={<XCircleIcon />}
                      onClick={() => setOpen(false)}
                    >
                      {t('button.cancel')}
                    </Button>
                  </Show>
                  <Button
                    icon={<CheckIcon />}
                    data-testid="confirmation-modal-ok"
                    loading={phase() === 'sending'}
                    onClick={() => void run()}
                  >
                    {t('button.ok')}
                  </Button>
                </>
              }
            >
              {/* empty / error: nothing to submit — a single Close. */}
              <Match when={phase() === 'empty' || phase() === 'error'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
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
