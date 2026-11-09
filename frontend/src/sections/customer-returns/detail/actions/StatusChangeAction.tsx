import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import {
  CancelButton,
  OkButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { ArrowRightIcon, InfoIcon } from '../../../../ui/icons';
import { filterByStatusPreference } from '@/domain/invoice';
import {
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
  /** ≥1 line — advancing an empty return is blocked (OMS-REG-DIST-07.38). */
  hasLines: boolean;
  /** The invoice-status-options preference (empty = no restriction). */
  statusOptions: readonly string[];
  /** The advance succeeded — merge the returned info over the node in place. */
  onApplied: (node: CustomerReturnInfoFragment) => void;
}

// The status-advance action (spec/customer-returns/ui-surface.md S3 § actions;
// the FinaliseAction shape): the footer's "Confirm {status}" split button +
// confirm → working → error dialog, plus a no-lines info dialog. The dropdown
// offers the forward statuses (rules § status lifecycle — RECEIVED / VERIFIED,
// forward-only), filtered by the invoice-status-options preference; hidden when
// the return offers no advance (terminal, or a transfer still in the sender's
// hands). While ON HOLD (or with no lines) the button stays
// active-and-explaining — the click surfaces the block instead of dead-ending
// greyed-out (D39); hold blocks exactly this advance (OMS-REG-DIST-07.7),
// releasing clears it (.32).
//
// The on-hold block is ACTIONABLE (D59, matching supplier returns): the confirm
// prompt offers to release the hold and advance in one save (onHold: false —
// rules § advancing status; OMS-REG-DIST-07.34), rather than sending the user
// off to find the Hold toggle.
//
// There is NO success phase: a successful advance CLOSES the dialog — closure
// is the confirmation, and the flipped status chip / lifecycle indicator /
// button label behind it are the visible result (spec/ui-standards/controls.md
// § dialogs, D22; § action feedback, D21).
//
// Every rejection is NON-typed (contract § advancing status):
// advanceReturnStatus maps extensions.details to translated copy shown in the
// dialog's error phase.
type Phase = 'confirm' | 'working' | 'error';

export const StatusChangeAction: Component<StatusChangeActionProps> = props => {
  const [pending, setPending] = createSignal<AdvanceTarget | undefined>();
  // Whether this advance ALSO releases the hold (the release-and-advance path).
  const [releaseHold, setReleaseHold] = createSignal(false);
  // The no-lines explainer (info only — an empty return can't advance; adding a
  // line lifts the block).
  const [noLinesBlocked, setNoLinesBlocked] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal('');

  const targets = () =>
    filterByStatusPreference(
      nextStatuses(returnKind(props.node), props.node.status),
      props.statusOptions
    );
  const nextTarget = () => targets()[0];

  const openConfirm = (status: string) => {
    // No lines: explain rather than dead-end (OMS-REG-DIST-07.38's UI surface —
    // the same rejection is server-enforced and asserted by the ACs).
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
      // Release the hold in the same request when we opened on that path.
      releaseHold() ? false : undefined
    );
    if (result.kind === 'failed') return close(); // global modal showed it
    if (result.kind === 'saved') {
      props.onApplied(result.node);
      return close(); // success closes — the advanced status IS the confirmation
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

      {/* Mounted only while open (kdd/action-modal) — a closed dialog keeps its
          `confirmation-modal` + footer ids matchable. `phase` lives in this
          component, not the dialog, and openConfirm resets it, so gating costs
          no state. */}
      <Show when={pending() != null}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={<ArrowRightIcon />}
          testId="confirmation-modal"
          // The error phase is no longer a question, so the heading stops asking
          // one (it would otherwise read "Are you sure?" over a rejection).
          title={
            phase() === 'error'
              ? t('heading.cannot-do-that')
              : t('heading.are-you-sure')
          }
          description={
            <Switch
              fallback={
                // On hold, the prompt says what the one save will do; otherwise
                // the plain status confirmation.
                releaseHold()
                  ? t('messages.confirm-release-hold-and-status-as', {
                      status: statusLabel(pending() ?? 'RECEIVED'),
                    })
                  : t('messages.confirm-status-as', {
                      status: statusLabel(pending() ?? 'RECEIVED'),
                    })
              }
            >
              <Match when={phase() === 'error'}>
                <Alert severity="error">{errorMessage()}</Alert>
              </Match>
            </Switch>
          }
          // Dialog-footer identity (D55): icon-less throughout. The confirm keeps
          // its own verb ("Confirm {status}") — a custom label is outside
          // "standard territory", so it stays a primary <Button> — while Cancel
          // and the error acknowledgement are the pre-composed pair.
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
                    {confirmLabel(pending() ?? 'RECEIVED')}
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

      {/* Blocked advance — no lines: an info-only dialog (adding a line lifts
          the block, OMS-REG-DIST-07.38). The on-hold block is handled inline
          above (actionable — D59).

          Mounted only while open (kdd/action-modal), like every other notice
          here: a closed-but-mounted Dialog leaves its footer button — and so
          its shared `dialog-button-ok` id — in the DOM, which makes that id
          ambiguous for anything selecting on it (e2e/TESTIDS.md). */}
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
