import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { CheckboxButton } from '@/ui/elements/buttons/CheckboxButton';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '@/ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { FinaliseAction } from './actions';
import { STATUS_LABELS, statusIndex } from './stocktakeStatus';
import type { StocktakeInfoFragment } from './lines/stocktakeDetail.generated';

// The stocktake-level footer (Open mSupply's StocktakeDetailView footer, no
// rows selected): the on-hold checkbox toggle, the status indicator, and the
// finalise action. On-hold uses a plain ConfirmDialog (no user-facing failure);
// finalise is its own self-contained component (the status stepper's
// SplitButton + confirm/success/error ActionModal + no-lines dialog — see
// FinaliseAction). This footer owns only the on-hold confirm; the mutations run
// through the view's callbacks (onSetHold → saveStocktakeFields, run →
// finaliseStocktake), which splice the returned node back with no refetch.
// Shown only when nothing is selected — the selection action bar replaces it
// (matching OMS, which swaps the whole footer).

export interface StocktakeStatusFooterProps {
  storeId: string;
  node: StocktakeInfoFragment;
  /**
   * True while status is not NEW or the stocktake is on hold — the edit lock
   * (OMS isDisabled).
   */
  disabled: boolean;
  /** Toggle the on-hold lock (writes isLocked). */
  onSetHold: (hold: boolean) => void;
  /**
   * The stocktake was finalised — merge the returned info over the node (in
   * place, no refetch).
   */
  onFinalised: (node: StocktakeInfoFragment) => void;
  /** A finalise rejection carrying offending lines — stamp them on the rows. */
  onError: (lineIds: string[]) => void;
  /**
   * The finalise error phase's "Show error lines": filter the list to the
   * stamped error lines.
   */
  onShowErrors: () => void;
}

export const StocktakeStatusFooter: Component<
  StocktakeStatusFooterProps
> = props => {
  // Confirm-before-act, like OMS: toggling on-hold confirms first.
  const [holdConfirm, setHoldConfirm] = createSignal(false);

  const isFinalised = () => props.node.status === 'FINALISED';
  const holding = () => props.node.isLocked;
  const currentIndex = () => statusIndex(props.node.status);

  // Status indicator steps — each stage + the datetime it was reached (for the
  // history popover).
  const steps = () => [
    {
      label: STATUS_LABELS.NEW,
      date: props.node.stocktakeDate ?? props.node.createdDatetime,
    },
    {
      label: STATUS_LABELS.FINALISED,
      date: props.node.finalisedDatetime ?? undefined,
    },
  ];

  return (
    <ContentFooter>
      {/* On-hold: a checkbox-in-a-button (OMS). Hidden once finalised (can't change a finalised
          stocktake). Confirms before toggling. */}
      <Show when={!isFinalised()}>
        <CheckboxButton
          checked={holding()}
          data-testid="on-hold-button"
          onChange={() => setHoldConfirm(true)}
        >
          {t('label.on-hold')}
        </CheckboxButton>
      </Show>

      <StatusIndicator steps={steps()} current={currentIndex()} />

      {/* Finalise — the status-change split button + its modals, self-contained (kdd/action-modal). */}
      <FinaliseAction
        storeId={props.storeId}
        node={props.node}
        disabled={props.disabled}
        onApplied={props.onFinalised}
        onError={props.onError}
        onShowErrors={props.onShowErrors}
      />

      {/* On-hold confirm: the message flips with the direction (set vs unset), matching OMS. */}
      <ConfirmDialog
        open={holdConfirm()}
        onClose={() => setHoldConfirm(false)}
        title={t('heading.are-you-sure')}
        message={
          holding()
            ? t('messages.not-on-hold-description')
            : t('messages.on-hold-description')
        }
        onConfirm={() => props.onSetHold(!holding())}
      />
    </ContentFooter>
  );
};
