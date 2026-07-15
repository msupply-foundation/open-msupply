import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { ArrowRightIcon, InfoIcon, CheckIcon } from '../../../ui/icons';
import { ActionModal, type ActionResult } from '../../../domain/action';
import { STATUS_FLOW, STATUS_LABELS, statusIndex } from '../stocktakeStatus';
import type { StocktakeInfoFragment } from '../stocktakeDetail.generated';

export interface FinaliseActionProps {
  node: StocktakeInfoFragment;
  /** True while status is not NEW or the stocktake is on hold — the edit lock (OMS isDisabled). */
  disabled: boolean;
  /** No countable lines → finalise can't run yet (OMS no-lines guard). */
  canFinalise: boolean;
  /** Finalise the stocktake — the only status write (NEW → FINALISED; no other transition). Its
   *  ActionResult drives the modal's success | error phase (an error carries the offending lines). */
  run: () => Promise<ActionResult>;
  /** Error phase's "Show error lines": apply the errors filter to the offending lines. */
  onShowErrors: (lineIds: string[]) => void;
}

// The Finalise action — a self-contained peer of the bulk selection actions (kdd/action-modal), but
// its trigger is the status stepper's SplitButton rather than a plain button. It owns the button,
// the confirm → working → success | error ActionModal (a finalise rejection carries per-line errors,
// so the error phase offers "Show error lines"), AND a no-lines info dialog. The status footer hosts
// it beside the StatusIndicator; the view supplies `run` (→ finaliseStocktake) and the callbacks.
export const FinaliseAction: Component<FinaliseActionProps> = (props) => {
  // pendingStatus drives the confirm modal (set by the split button); noLinesOpen the info dialog.
  const [pendingStatus, setPendingStatus] = createSignal<string | undefined>();
  const [noLinesOpen, setNoLinesOpen] = createSignal(false);

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

      {/* Finalise: confirm → working → success | error (shared ActionModal). The confirm body is
          the finalise warning; run() reports a rejection with the offending lines, and the error
          phase offers "Show error lines". Opened by the SplitButton via pendingStatus. */}
      <ActionModal
        open={pendingStatus() != null}
        onClose={() => setPendingStatus(undefined)}
        icon={<ArrowRightIcon />}
        title={t('stocktake.finalise.confirm-title')}
        confirmLabel={t('stocktake.detail.finalise')}
        confirmIcon={<ArrowRightIcon />}
        run={props.run}
        successMessage={t('stocktake.finalise.success')}
        onShowErrors={props.onShowErrors}
      >
        {t('stocktake.finalise.confirm')}
      </ActionModal>

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
