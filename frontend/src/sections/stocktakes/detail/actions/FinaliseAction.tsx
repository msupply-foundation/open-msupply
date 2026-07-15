import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { ContentFooterActions } from '../../../../ui/layout/ContentFooter/ContentFooterActions';
import { ArrowRightIcon, InfoIcon, CheckIcon, XCircleIcon } from '../../../../ui/icons';
import { STATUS_FLOW, STATUS_LABELS, statusIndex } from '../stocktakeStatus';
import { finaliseStocktake } from '../stocktakeUpdate';
import type { StocktakeInfoFragment } from '../lines/stocktakeDetail.generated';

export interface FinaliseActionProps {
  storeId: string;
  node: StocktakeInfoFragment;
  /** True while status is not NEW or the stocktake is on hold — the edit lock (OMS isDisabled). */
  disabled: boolean;
  /** No countable lines → finalise can't run yet (OMS no-lines guard). */
  canFinalise: boolean;
  /** The stocktake was finalised — the view merges the returned info over its node (in place, no
   *  refetch). Fires the moment the mutation succeeds. */
  onApplied: (node: StocktakeInfoFragment) => void;
  /** A finalise rejection carrying offending lines — stamp them on the rows + jump to them. */
  onError: (lineIds: string[]) => void;
}

// The Finalise action — a self-contained peer of the bulk selection actions (kdd/action-modal), but
// its trigger is the status stepper's SplitButton rather than a plain button. It owns the button,
// the finalise mutation (finaliseStocktake — the ONLY status write, NEW → FINALISED, no un-finalise),
// the confirm → working dialog, AND a no-lines info dialog.
//
// The confirm dialog is inline (not via a shared ActionModal) so the whole flow is readable in one
// place (kdd/explicit-composition). On resolution it always closes: on success onApplied merges the
// saved node (the FINALISED status shows in the footer behind the closing modal); on a rejection
// onError stamps the offending lines + jumps to them (no in-modal error phase). A transport failure
// is silent (handled globally) → just closes.
export const FinaliseAction: Component<FinaliseActionProps> = (props) => {
  // pendingStatus drives the confirm modal (set by the split button); noLinesOpen the info dialog.
  const [pendingStatus, setPendingStatus] = createSignal<string | undefined>();
  const [noLinesOpen, setNoLinesOpen] = createSignal(false);
  const [working, setWorking] = createSignal(false);

  const isFinalised = () => props.node.status === 'FINALISED';
  const currentIndex = () => statusIndex(props.node.status);

  // Change-status options: EVERY status, with those at-or-before the current one disabled (shown
  // for context, not selectable) — so New appears greyed and only a forward move is pickable.
  const statusOptions = () =>
    STATUS_FLOW.map((status, index) => ({
      value: status,
      label: STATUS_LABELS[status],
      disabled: index <= currentIndex(),
    }));

  // The next reachable status — what the main button confirms (the first non-disabled option).
  const nextStatus = () => STATUS_FLOW[currentIndex() + 1];

  const requestStatus = (status: string) => {
    // A finalised/locked stocktake can't change status — the split button is hidden then (Show
    // below), so this is just a guard.
    if (props.disabled) return;
    // No counted lines: explain why, rather than open the finalise confirm on an empty count. We
    // keep the button active (not greyed like OMS) so the click is never a dead end.
    if (!props.canFinalise) {
      setNoLinesOpen(true);
      return;
    }
    setPendingStatus(status);
  };

  const run = async () => {
    if (working()) return; // re-entry guard
    setWorking(true);
    const result = await finaliseStocktake(props.storeId, props.node.id);
    if (result.kind === 'saved') props.onApplied(result.node);
    else if (result.kind === 'error') props.onError(result.lineIds);
    setWorking(false);
    setPendingStatus(undefined);
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
            onAction={requestStatus}
            menuLabel={t('stocktake.detail.finalise')}
          />
        </ContentFooterActions>
      </Show>

      {/* Finalise confirm → working. Opened by the SplitButton via pendingStatus; a rejection's
          offending lines surface on the rows (onError), so there's no in-modal error phase. */}
      <Dialog
        open={pendingStatus() != null}
        dismissable={!working()}
        onClose={() => setPendingStatus(undefined)}
        icon={<ArrowRightIcon />}
        title={t('stocktake.finalise.confirm-title')}
        description={t('stocktake.finalise.confirm')}
        actions={
          <>
            <Show when={!working()}>
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                onClick={() => setPendingStatus(undefined)}
              >
                {t('common.cancel')}
              </Button>
            </Show>
            <Button
              variant="primary"
              icon={<ArrowRightIcon />}
              loading={working()}
              onClick={() => void run()}
            >
              {t('stocktake.detail.finalise')}
            </Button>
          </>
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
          <Button variant="secondary" icon={<CheckIcon />} onClick={() => setNoLinesOpen(false)}>
            {t('common.ok')}
          </Button>
        }
      />
    </>
  );
};
