import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../intl';
import { CheckboxButton } from '../../ui/elements/buttons/CheckboxButton';
import { SplitButton } from '../../ui/elements/buttons/SplitButton';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions';
import { ArrowRightIcon } from '../../ui/icons';
import type { StocktakeInfoFragment } from './stocktakeDetail.generated';

// The stocktake-level footer (Open mSupply's StocktakeDetailView footer, no rows selected): the
// on-hold checkbox toggle, the status indicator, and the status-change split button. It owns ONLY
// its two confirm dialogs' open state; the mutations run through the view's callbacks (onSetHold /
// onFinalise → runStocktakeUpdate), which splice the returned node back with no refetch and route
// a finalise rejection into the error-summary dialog. Shown only when nothing is selected — the
// selection action bar replaces it (matching OMS, which swaps the whole footer).

// The stocktake status flow, in order. The status indicator renders every stage; the change
// button lists every stage too, disabling those at-or-before the current one (you can only move
// forward). A stocktake's flow is just New → Finalised, but this is written as an ordered list so
// it reads the same as the multi-step flows (shipments) that share these components.
const STATUS_FLOW = ['NEW', 'FINALISED'] as const;
type StocktakeStatus = (typeof STATUS_FLOW)[number];

const STATUS_LABELS: Record<StocktakeStatus, string> = {
  get NEW() {
    return t('stocktake.status.new');
  },
  get FINALISED() {
    return t('stocktake.status.finalised');
  },
};

export interface StocktakeStatusFooterProps {
  node: StocktakeInfoFragment;
  /** True while status is not NEW or the stocktake is on hold — the edit lock (OMS isDisabled). */
  disabled: boolean;
  /** No countable lines → the status change is blocked (OMS no-lines guard). */
  canFinalise: boolean;
  /** Toggle the on-hold lock (writes isLocked). */
  onSetHold: (hold: boolean) => void;
  /** Advance the stocktake to a new status (writes status; only FINALISED is reachable). */
  onChangeStatus: (status: StocktakeStatus) => void;
}

export const StocktakeStatusFooter: Component<StocktakeStatusFooterProps> = (props) => {
  // Confirm-before-act, like OMS: toggling on-hold and changing status both confirm first. The
  // pending status is remembered so the confirm dialog acts on the option the user picked.
  const [holdConfirm, setHoldConfirm] = createSignal(false);
  const [pendingStatus, setPendingStatus] = createSignal<StocktakeStatus | undefined>();

  const isFinalised = () => props.node.status === 'FINALISED';
  const holding = () => props.node.isLocked;
  const currentIndex = () => STATUS_FLOW.indexOf(props.node.status as StocktakeStatus);

  // Status indicator steps — each stage + the datetime it was reached (for the history popover).
  const steps = () => [
    { label: STATUS_LABELS.NEW, date: props.node.stocktakeDate ?? props.node.createdDatetime },
    { label: STATUS_LABELS.FINALISED, date: props.node.finalisedDatetime ?? undefined },
  ];

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
    if (props.disabled || !props.canFinalise) return;
    setPendingStatus(status as StocktakeStatus);
  };

  return (
    <ContentFooter>
      {/* On-hold: a checkbox-in-a-button (OMS). Hidden once finalised (can't change a finalised
          stocktake). Confirms before toggling. */}
      <Show when={!isFinalised()}>
        <CheckboxButton checked={holding()} onChange={() => setHoldConfirm(true)}>
          {t('stocktake.detail.on-hold')}
        </CheckboxButton>
      </Show>

      <StatusIndicator steps={steps()} current={currentIndex()} />

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

      {/* On-hold confirm: the message flips with the direction (set vs unset), matching OMS. */}
      <ConfirmDialog
        open={holdConfirm()}
        onClose={() => setHoldConfirm(false)}
        title={t('stocktake.on-hold.confirm-title')}
        message={holding() ? t('stocktake.on-hold.unset') : t('stocktake.on-hold.set')}
        onConfirm={() => props.onSetHold(!holding())}
      />

      {/* Status-change confirm. */}
      <ConfirmDialog
        open={pendingStatus() != null}
        onClose={() => setPendingStatus(undefined)}
        title={t('stocktake.finalise.confirm-title')}
        message={t('stocktake.finalise.confirm')}
        confirmLabel={t('stocktake.detail.finalise')}
        onConfirm={() => {
          const status = pendingStatus();
          if (status) props.onChangeStatus(status);
        }}
      />
    </ContentFooter>
  );
};
