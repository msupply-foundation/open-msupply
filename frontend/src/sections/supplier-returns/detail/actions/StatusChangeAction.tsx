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
  statusLabel,
  type AdvanceTarget,
} from '../returnStatus';
import { advanceReturnStatus } from '../returnUpdate';
import type { SupplierReturnInfoFragment } from '../supplierReturnDetail.generated';

export interface StatusChangeActionProps {
  storeId: string;
  node: SupplierReturnInfoFragment;
  /** ≥1 line — advancing an empty return is blocked. */
  hasLines: boolean;
  /** The invoice-status-options preference (empty = no restriction). */
  statusOptions: readonly string[];
  /** The advance succeeded — merge the returned info over the node in place. */
  onApplied: (node: SupplierReturnInfoFragment) => void;
}

// The status-advance action (spec/supplier-returns/ui-surface.md S3 § actions):
// the footer's "Confirm {status}" split button + confirm → working → success |
// error dialog, plus the blocked-advance explainers. The dropdown offers the
// forward statuses (rules § status lifecycle — PICKED / SHIPPED, forward-only),
// filtered by the invoice-status-options preference; hidden when the return
// offers no advance (terminal). While ON HOLD (or with no lines) the button
// stays active-and-explaining — the click surfaces the block instead of acting
// (D39). The on-hold block is ACTIONABLE: it offers to release the hold and
// advance in one save (onHold:false — rules § advancing status; D59).
//
// Every rejection is NON-typed (contract § advancing status): advanceReturnStatus
// maps extensions.details to translated copy shown in the dialog's error phase.
type Phase = 'confirm' | 'working' | 'success' | 'error';

export const StatusChangeAction: Component<StatusChangeActionProps> = props => {
  const [pending, setPending] = createSignal<AdvanceTarget | undefined>();
  // Whether this advance ALSO releases the hold (the release-and-advance path).
  const [releaseHold, setReleaseHold] = createSignal(false);
  // The no-lines explainer (info only — an empty return can't advance).
  const [noLinesBlocked, setNoLinesBlocked] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal('');

  const targets = () =>
    filterByStatusPreference(
      nextStatuses(props.node.status),
      props.statusOptions
    );
  const nextTarget = () => targets()[0];

  const openConfirm = (status: string) => {
    // No lines: explain rather than dead-end.
    if (!props.hasLines) {
      setNoLinesBlocked(true);
      return;
    }
    // On hold: the confirm prompt offers to release the hold in the same save
    // (D59); otherwise a plain advance confirm.
    setReleaseHold(props.node.onHold);
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
      status,
      // Release the hold in the same request when we opened on the release path.
      releaseHold() ? false : undefined
    );
    if (result.kind === 'failed') return close(); // global modal showed it
    if (result.kind === 'saved') {
      props.onApplied(result.node);
      return setPhase('success');
    }
    setErrorMessage(result.message);
    setPhase('error');
  };

  // The confirm-phase button label / prompt: the release-and-advance variant
  // when the return is on hold, otherwise the plain confirm.
  const confirmLabel = (status: AdvanceTarget) =>
    releaseHold()
      ? t('button.release-hold-and-confirm-status', {
          status: statusLabel(status),
        })
      : t('button.save-and-confirm-status', { status: statusLabel(status) });

  return (
    <>
      <Show when={nextTarget()}>
        {next => (
          <SplitButton
            icon={<ArrowRightIcon />}
            // Each option is the full confirm phrase ("Confirm Picked").
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
              status: statusLabel(pending() ?? 'PICKED'),
            })}
          >
            <Match when={phase() === 'success'}>
              {t('messages.return-saved')}
            </Match>
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
                  {confirmLabel(pending() ?? 'PICKED')}
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

      {/* Blocked advance — no lines: an info-only dialog (adding a line lifts
          the block). The on-hold block is handled inline above (actionable). */}
      <Dialog
        open={noLinesBlocked()}
        onClose={() => setNoLinesBlocked(false)}
        icon={<InfoIcon />}
        title={t('heading.are-you-sure')}
        description={t('messages.no-lines')}
        actions={
          <Button
            variant="secondary"
            icon={<CheckIcon />}
            onClick={() => setNoLinesBlocked(false)}
          >
            {t('button.ok')}
          </Button>
        }
      />
    </>
  );
};
