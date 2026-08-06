import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { SplitButton } from '@/ui/elements/buttons/SplitButton';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { ArrowRightIcon, InfoIcon } from '@/ui/icons';
import {
  blockedByZeroLines,
  nextStatuses,
  statusLabel,
  type MovementStatus,
} from '../stockMovementStatus';
import { advanceStatus } from '../stockMovementUpdate';
import type { StockMovementInfoFragment } from '../stockMovementDetail.generated';

export interface StatusChangeActionProps {
  storeId: string;
  node: StockMovementInfoFragment;
  /** The advance succeeded — merge the returned info over the node in place. */
  onApplied: (node: StockMovementInfoFragment) => void;
}

// The status-advance action (spec/stock-movements/ui-surface.md S2 § status
// footer; the customer-returns StatusChangeAction shape): the footer's
// "Confirm ‹status›" split button offering the forward statuses (rules
// § status lifecycle — Confirmed / Finalised, skip allowed, never backward),
// a confirm → working → error dialog, and the ZERO-LINE info dialog (rules
// § status changes and the zero-line gate — ANY status change is blocked
// with a notice while the movement has no lines; the button stays
// active-and-explaining rather than dead-ending greyed-out, D39).
// OMS-REG-SMV-09 .4/.6 (unit-anchored in stockMovementStatus.test.ts);
// .17/.23/.24 own the server-rejection outcomes end-to-end.
//
// NO success phase: a successful advance CLOSES the dialog — closure is the
// confirmation (D21/D22); the flipped chip / lifecycle indicator / button
// label are the visible result.
//
// Rejections: the typed finalise pair (NotEnoughStock / LocationOnHold) show
// their description; everything else is non-typed and mapped to translated
// copy (stockMovementUpdate.advanceStatus) in the dialog's error phase.
type Phase = 'confirm' | 'working' | 'error';

export const StatusChangeAction: Component<StatusChangeActionProps> = props => {
  const [pending, setPending] = createSignal<MovementStatus | undefined>();
  const [noLinesBlocked, setNoLinesBlocked] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal('');

  const targets = () => nextStatuses(props.node.status);
  const nextTarget = () => targets()[0];

  const openConfirm = (status: string) => {
    if (blockedByZeroLines(props.node)) {
      setNoLinesBlocked(true);
      return;
    }
    setPhase('confirm');
    setPending(status as MovementStatus);
  };
  const close = () => setPending(undefined);

  const run = async () => {
    const status = pending();
    if (phase() !== 'confirm' || !status) return; // re-entry guard
    setPhase('working');
    const result = await advanceStatus(props.storeId, props.node.id, status);
    if (result.kind === 'failed') return close(); // global modal showed it
    if (result.kind === 'saved') {
      props.onApplied(result.node);
      return close(); // success closes — the advanced status IS the confirmation
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

      {/* Mounted only while open (kdd/action-modal). */}
      <Show when={pending() != null}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={<ArrowRightIcon />}
          testId="confirmation-modal"
          title={
            phase() === 'error'
              ? t('heading.cannot-do-that')
              : t('heading.are-you-sure')
          }
          description={
            <Switch
              fallback={t('messages.confirm-status-as', {
                status: statusLabel(pending() ?? 'CONFIRMED'),
              })}
            >
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
                    <CancelButton
                      data-testid="dialog-button-cancel"
                      onClick={close}
                    />
                  </Show>
                  <Button
                    variant="primary"
                    loading={phase() === 'working'}
                    confirms="plain"
                    data-testid="confirmation-modal-ok"
                    onClick={() => void run()}
                  >
                    {t('button.save-and-confirm-status', {
                      status: statusLabel(pending() ?? 'CONFIRMED'),
                    })}
                  </Button>
                </>
              }
            >
              <Match when={phase() === 'error'}>
                <OkButton data-testid="dialog-button-ok" onClick={close} />
              </Match>
            </Switch>
          }
        />
      </Show>

      {/* The zero-line gate's explainer (rules § status changes and the
          zero-line gate; OMS-REG-SMV-09.4) — info only; adding a line lifts
          the block. Mounted only while open. */}
      <Show when={noLinesBlocked()}>
        <Dialog
          open
          onClose={() => setNoLinesBlocked(false)}
          icon={<InfoIcon />}
          title={t('heading.cannot-do-that')}
          description={t('messages.no-lines')}
          actions={
            <OkButton
              data-testid="dialog-button-ok"
              onClick={() => setNoLinesBlocked(false)}
            />
          }
        />
      </Show>
    </>
  );
};
