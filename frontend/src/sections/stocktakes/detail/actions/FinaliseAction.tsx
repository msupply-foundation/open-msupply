import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { SplitButton } from '@/ui/elements/buttons/SplitButton';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { ArrowRightIcon, CheckIcon, XCircleIcon } from '@/ui/icons';
import { STATUS_FLOW, STATUS_LABELS, statusIndex } from '../stocktakeStatus';
import { finaliseStocktake } from '../stocktakeUpdate';
import type { StocktakeInfoFragment } from '../lines/stocktakeDetail.generated';

export interface FinaliseActionProps {
  storeId: string;
  node: StocktakeInfoFragment;
  /**
   * True while status is not NEW or the stocktake is on hold — the edit lock
   * (OMS isDisabled).
   */
  disabled: boolean;
  /**
   * The stocktake was finalised — the view merges the returned info over its
   * node (in place, no
   *  refetch). Fires the moment the mutation succeeds. */
  onApplied: (node: StocktakeInfoFragment) => void;
  /** A finalise rejection carrying offending lines — stamp them on the rows. */
  onError: (lineIds: string[]) => void;
  /**
   * The error phase's "Show error lines": filter the list to the stamped error
   * lines.
   */
  onShowErrors: () => void;
}

// The Finalise action — a self-contained peer of the bulk selection actions
// (kdd/action-modal), but its trigger is the status stepper's SplitButton
// rather than a plain button. It owns the button, the finalise mutation
// (finaliseStocktake — the ONLY status write, NEW → FINALISED, no un-finalise),
// the confirm → working → success | error dialog.
//
// The confirm dialog is inline (not via a shared ActionModal) so the whole
// flow is readable in one place (kdd/explicit-composition). On success
// onApplied merges the saved node (the FINALISED status shows in the footer
// behind the success message); on a rejection onError stamps the offending
// lines (rows show them), the error phase shows the server's translated
// message and offers "Show error lines" (onShowErrors) when the rejection
// carries line ids. A transport failure is silent (handled globally) → just
// closes.
//
// There is deliberately NO client-side "has counted lines" pre-check: the old
// one only saw the current page and wrongly blocked finalising a stocktake with
// placeholder lines on the first page but counted lines further in (issue
// #791). The server is the source of truth — a truly-empty stocktake comes back
// as NoLines and lands in the error phase like any other rejection.
type Phase = 'confirm' | 'working' | 'success' | 'error';

export const FinaliseAction: Component<FinaliseActionProps> = props => {
  // pendingStatus != null opens the finalise confirm dialog (set by the split
  // button). phase drives the dialog once open; errorMessage holds the server's
  // translated rejection text for the error phase.
  const [pendingStatus, setPendingStatus] = createSignal<string | undefined>();
  const [errorMessage, setErrorMessage] = createSignal<string>('');
  // Whether the rejection carried offending line ids (the snapshot mismatch) —
  // gates the error phase's "Show error lines" action, which has nothing to
  // filter to for a line-less rejection like NoLines / StocktakeIsLocked.
  const [hasErrorLines, setHasErrorLines] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');

  const isFinalised = () => props.node.status === 'FINALISED';
  const currentIndex = () => statusIndex(props.node.status);

  // Change-status options: EVERY status, with those at-or-before the current
  // one disabled (shown for context, not selectable) — so New appears greyed
  // and only a forward move is pickable.
  const statusOptions = () =>
    STATUS_FLOW.map((status, index) => ({
      value: status,
      label: STATUS_LABELS[status],
      disabled: index <= currentIndex(),
    }));

  // The next reachable status — what the main button confirms (the first
  // non-disabled option).
  const nextStatus = () => STATUS_FLOW[currentIndex() + 1];

  // The dialog's header tracks the phase: confirm/working ask ("Are you sure?"
  // → arrow); success reports the outcome ("Finalised" ✓); error flags it
  // (something-wrong ✗). Keeping "Are you sure?" + the forward arrow on the
  // success screen read wrong once the stocktake was already finalised.
  const title = () => {
    switch (phase()) {
      case 'success':
        return t('status.finalised');
      case 'error':
        return t('error.something-wrong');
      default:
        return t('heading.are-you-sure');
    }
  };
  const icon = () => {
    switch (phase()) {
      case 'success':
        return <CheckIcon />;
      case 'error':
        return <XCircleIcon />;
      default:
        return <ArrowRightIcon />;
    }
  };

  const openConfirm = (status: string) => {
    // A finalised/locked stocktake can't change status — the split button is
    // hidden then (Show below), so this is just a guard.
    if (props.disabled) return;
    setPhase('confirm');
    setPendingStatus(status);
  };
  const close = () => setPendingStatus(undefined);

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('working');
    const result = await finaliseStocktake(props.storeId, props.node.id);
    // Transport / NodeError → the global modal already showed it; just close.
    if (result.kind === 'failed') return close();
    if (result.kind === 'saved') {
      props.onApplied(result.node);
      return setPhase('success');
    }
    props.onError(result.lineIds); // stamp so the rows show the mismatch
    setErrorMessage(result.message); // the server's translated rejection text
    setHasErrorLines(result.lineIds.length > 0);
    setPhase('error');
  };

  return (
    <>
      {/* Status change: hidden once finalised. The main button confirms the next status; the
          dropdown lists all statuses with past/current disabled. */}
      <Show when={!isFinalised() && nextStatus()}>
        <ContentFooterActions>
          <SplitButton
            icon={<ArrowRightIcon />}
            options={statusOptions()}
            value={nextStatus()}
            onAction={openConfirm}
            menuLabel={t('button.finalise')}
            testId="status-change-button"
          />
        </ContentFooterActions>
      </Show>

      {/* Finalise confirm → working → success | error. Opened by the SplitButton via pendingStatus.
          Gated by <Show> so the confirm <dialog> isn't in the DOM at all while
          closed — otherwise this always-mounted `confirmation-modal` testid
          coexists with a sibling action's confirm (e.g. change-location),
          tripping the shared e2e suite's strict-mode locator. The phase/status
          signals live on the parent, so gating never loses in-flight state. */}
      <Show when={pendingStatus() != null}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={icon()}
          testId="confirmation-modal"
          title={title()}
          description={
            <Switch
              fallback={t('messages.confirm-status-as', {
                status: t('status.finalised'),
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
                // confirm / working: Cancel (hidden while working) + the
                // loading Finalise.
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
                    data-testid="confirmation-modal-ok"
                    onClick={() => void run()}
                  >
                    {t('button.save-and-confirm-status', {
                      status: STATUS_LABELS[nextStatus()],
                    })}
                  </Button>
                </>
              }
            >
              <Match when={phase() === 'success'}>
                <Button
                  variant="secondary"
                  data-testid="dialog-button-ok"
                  onClick={close}
                >
                  {t('button.ok')}
                </Button>
              </Match>
              <Match when={phase() === 'error'}>
                {/* "Show error lines" only makes sense when the rejection
                    carries offending line ids (the snapshot mismatch). A
                    line-less rejection (NoLines / lock) has nothing to filter
                    to, so it closes with a single OK. */}
                <Show
                  when={hasErrorLines()}
                  fallback={
                    <Button
                      variant="secondary"
                      data-testid="dialog-button-ok"
                      onClick={close}
                    >
                      {t('button.ok')}
                    </Button>
                  }
                >
                  <CancelButton
                    data-testid="dialog-button-cancel"
                    onClick={close}
                  />
                  <Button
                    variant="primary"
                    onClick={() => {
                      props.onShowErrors();
                      close();
                    }}
                  >
                    {t('button.show-error-lines')}
                  </Button>
                </Show>
              </Match>
            </Switch>
          }
        />
      </Show>
    </>
  );
};
