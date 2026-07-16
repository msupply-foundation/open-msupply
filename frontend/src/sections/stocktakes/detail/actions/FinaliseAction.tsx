import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { ContentFooterActions } from '../../../../ui/layout/ContentFooter/ContentFooterActions';
import {
  ArrowRightIcon,
  InfoIcon,
  CheckIcon,
  SearchIcon,
  XCircleIcon,
} from '../../../../ui/icons';
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
  /** No countable lines → finalise can't run yet (OMS no-lines guard). */
  canFinalise: boolean;
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
// the confirm → working → success | error dialog, AND a no-lines info dialog.
//
// The confirm dialog is inline (not via a shared ActionModal) so the whole
// flow is readable in one place (kdd/explicit-composition). On success
// onApplied merges the saved node (the FINALISED status shows in the footer
// behind the success message); on a rejection onError stamps the offending
// lines (rows show them) and the error phase offers "Show error lines"
// (onShowErrors). A transport failure is silent (handled globally) → just
// closes.
type Phase = 'confirm' | 'working' | 'success' | 'error';

export const FinaliseAction: Component<FinaliseActionProps> = props => {
  // pendingStatus != null opens the finalise confirm dialog (set by the split
  // button); noLinesOpen the info dialog. phase drives the confirm dialog once
  // open.
  const [pendingStatus, setPendingStatus] = createSignal<string | undefined>();
  const [noLinesOpen, setNoLinesOpen] = createSignal(false);
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

  const openConfirm = (status: string) => {
    // A finalised/locked stocktake can't change status — the split button is
    // hidden then (Show below), so this is just a guard.
    if (props.disabled) return;
    // No counted lines: explain why, rather than open the finalise confirm on
    // an empty count. We keep the button active (not greyed like OMS) so the
    // click is never a dead end.
    if (!props.canFinalise) {
      setNoLinesOpen(true);
      return;
    }
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
            menuLabel={t('stocktake.detail.finalise')}
          />
        </ContentFooterActions>
      </Show>

      {/* Finalise confirm → working → success | error. Opened by the SplitButton via pendingStatus. */}
      <Dialog
        open={pendingStatus() != null}
        dismissable={phase() !== 'working'}
        onClose={close}
        icon={<ArrowRightIcon />}
        title={t('stocktake.finalise.confirm-title')}
        description={
          <Switch fallback={t('stocktake.finalise.confirm')}>
            <Match when={phase() === 'success'}>
              {t('stocktake.finalise.success')}
            </Match>
            <Match when={phase() === 'error'}>
              <Alert severity="error">
                {t('stocktake.update-error.snapshot-mismatch')}
              </Alert>
            </Match>
          </Switch>
        }
        actions={
          <Switch
            fallback={
              // confirm / working: Cancel (hidden while working) + the loading
              // Finalise.
              <>
                <Show when={phase() === 'confirm'}>
                  <Button
                    variant="secondary"
                    icon={<XCircleIcon />}
                    onClick={close}
                  >
                    {t('common.cancel')}
                  </Button>
                </Show>
                <Button
                  variant="primary"
                  icon={<ArrowRightIcon />}
                  loading={phase() === 'working'}
                  onClick={() => void run()}
                >
                  {t('stocktake.detail.finalise')}
                </Button>
              </>
            }
          >
            <Match when={phase() === 'success'}>
              <Button variant="secondary" icon={<CheckIcon />} onClick={close}>
                {t('common.ok')}
              </Button>
            </Match>
            <Match when={phase() === 'error'}>
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                onClick={close}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                icon={<SearchIcon />}
                onClick={() => {
                  props.onShowErrors();
                  close();
                }}
              >
                {t('stocktake.errors.show')}
              </Button>
            </Match>
          </Switch>
        }
      />

      {/* No counted lines: an info-only dialog (single OK) explaining the finalise can't run yet,
          shown instead of a silent no-op when the split button is pressed with nothing counted. */}
      <Dialog
        open={noLinesOpen()}
        onClose={() => setNoLinesOpen(false)}
        icon={<InfoIcon />}
        title={t('stocktake.finalise.no-lines-title')}
        description={t('stocktake.finalise.no-lines')}
        actions={
          <Button
            variant="secondary"
            icon={<CheckIcon />}
            onClick={() => setNoLinesOpen(false)}
          >
            {t('common.ok')}
          </Button>
        }
      />
    </>
  );
};
