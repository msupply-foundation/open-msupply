import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import {
  ArrowRightIcon,
  CheckIcon,
  InfoIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import {
  filterByStatusPreference,
  nextStatuses,
  returnKind,
  statusLabel,
  type AdvanceTarget,
} from '../returnStatus';
import { advanceReturnStatus } from '../returnUpdate';
import type { CustomerReturnInfoFragment } from '../customerReturnDetail.generated';

export interface StatusChangeActionProps {
  storeId: string;
  node: CustomerReturnInfoFragment;
  /** ≥1 line — advancing an empty return is blocked (AC-S4). */
  hasLines: boolean;
  /** The invoice-status-options preference (empty = no restriction). */
  statusOptions: readonly string[];
  /** The advance succeeded — merge the returned info over the node in place. */
  onApplied: (node: CustomerReturnInfoFragment) => void;
}

// The status-advance action (spec/customer-returns/ui-surface.md S3 § actions;
// the FinaliseAction shape): the footer's "Confirm {status}" split button +
// confirm → working → success | error dialog, plus a no-lines info dialog.
// The dropdown offers the forward statuses (rules § status lifecycle —
// RECEIVED / VERIFIED, forward-only), filtered by the invoice-status-options
// preference; hidden when the return offers no advance (terminal, or a
// transfer still in the sender's hands). While ON HOLD the button is disabled
// — hold blocks exactly this (AC-S5); releasing re-enables it.
//
// Every rejection is NON-typed (contract § advancing status):
// advanceReturnStatus maps extensions.details to translated copy shown in the
// dialog's error phase.
type Phase = 'confirm' | 'working' | 'success' | 'error';

export const StatusChangeAction: Component<StatusChangeActionProps> = props => {
  const [pending, setPending] = createSignal<AdvanceTarget | undefined>();
  // The blocked-advance explainer (no lines / on hold): like the reference
  // FinaliseAction, the button stays active so the click explains itself
  // instead of dead-ending greyed-out.
  const [blockedMessage, setBlockedMessage] = createSignal<
    string | undefined
  >();
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal('');

  const targets = () =>
    filterByStatusPreference(
      nextStatuses(returnKind(props.node), props.node.status),
      props.statusOptions
    );
  const nextTarget = () => targets()[0];

  const openConfirm = (status: string) => {
    // No lines / on hold: explain rather than dead-end (AC-S4 / AC-S5's UI
    // surface — the same rejections are server-enforced and asserted by the
    // ACs).
    if (!props.hasLines) {
      setBlockedMessage(t('messages.no-lines'));
      return;
    }
    if (props.node.onHold) {
      setBlockedMessage(t('messages.on-hold-description'));
      return;
    }
    setPhase('confirm');
    setPending(status as AdvanceTarget);
  };
  const close = () => setPending(undefined);

  const run = async () => {
    const status = pending();
    if (phase() !== 'confirm' || !status) return; // re-entry guard
    setPhase('working');
    const result = await advanceReturnStatus(
      props.storeId,
      props.node.id,
      status
    );
    if (result.kind === 'failed') return close(); // global modal showed it
    if (result.kind === 'saved') {
      props.onApplied(result.node);
      return setPhase('success');
    }
    setErrorMessage(result.message);
    setPhase('error');
  };

  return (
    <>
      <Show when={nextTarget()}>
        {next => (
          <SplitButton
            icon={<ArrowRightIcon />}
            // Each option is the full confirm phrase ("Confirm Received"), the
            // current app's getButtonLabel — the main face shows the selected
            // option's label, so it reads the same there and in the menu.
            options={targets().map(status => ({
              value: status,
              label: t('button.save-and-confirm-status', {
                status: statusLabel(status),
              }),
            }))}
            value={next()}
            onAction={openConfirm}
            menuLabel={t('button.save-and-confirm-status', {
              status: statusLabel(next()),
            })}
            testId="status-change-button"
          />
        )}
      </Show>

      <Dialog
        open={pending() != null}
        dismissable={phase() !== 'working'}
        onClose={close}
        icon={<ArrowRightIcon />}
        testId="confirmation-modal"
        title={t('heading.are-you-sure')}
        description={
          <Switch
            fallback={t('messages.confirm-status-as', {
              status: statusLabel(pending() ?? 'RECEIVED'),
            })}
          >
            <Match when={phase() === 'success'}>{t('messages.saved')}</Match>
            <Match when={phase() === 'error'}>
              <Alert severity="error">{errorMessage()}</Alert>
            </Match>
          </Switch>
        }
        actions={
          <Switch
            fallback={
              <>
                <Show when={phase() === 'confirm'}>
                  <Button
                    variant="secondary"
                    icon={<XCircleIcon />}
                    data-testid="dialog-button-cancel"
                    onClick={close}
                  >
                    {t('button.cancel')}
                  </Button>
                </Show>
                <Button
                  variant="primary"
                  icon={<ArrowRightIcon />}
                  loading={phase() === 'working'}
                  data-testid="confirmation-modal-ok"
                  onClick={() => void run()}
                >
                  {t('button.save-and-confirm-status', {
                    status: statusLabel(pending() ?? 'RECEIVED'),
                  })}
                </Button>
              </>
            }
          >
            <Match when={phase() === 'success' || phase() === 'error'}>
              <Button
                variant="secondary"
                icon={<CheckIcon />}
                data-testid="dialog-button-ok"
                onClick={close}
              >
                {t('button.ok')}
              </Button>
            </Match>
          </Switch>
        }
      />

      {/* Blocked advance (no lines / on hold): an info-only dialog explaining
          why the advance can't run yet (AC-S4 / AC-S5). */}
      <Dialog
        open={blockedMessage() != null}
        onClose={() => setBlockedMessage(undefined)}
        icon={<InfoIcon />}
        title={t('heading.are-you-sure')}
        description={blockedMessage()}
        actions={
          <Button
            variant="secondary"
            icon={<CheckIcon />}
            onClick={() => setBlockedMessage(undefined)}
          >
            {t('button.ok')}
          </Button>
        }
      />
    </>
  );
};
