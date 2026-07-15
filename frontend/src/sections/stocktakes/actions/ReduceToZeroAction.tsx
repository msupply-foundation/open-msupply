import { createSignal, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { CheckIcon, MinusCircleIcon } from '../../../ui/icons';
import { SelectionActionModal, type SelectionActionResult } from '../../../domain/selection';
import { ReasonSelect } from '../../../domain/reasonOptions';
import type { StocktakeLineFragment } from '../stocktakeDetail.generated';
import { updateStocktakeLines } from '../stocktakeUpdate';

export interface ReduceToZeroActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  onUpdated: (lines: StocktakeLineFragment[]) => void;
  onError: (message: string, lineIds: string[]) => void;
  onShowErrors: (lineIds: string[]) => void;
}

// The Reduce-to-0 selection action: its footer button + a confirm modal with a negative-adjustment
// ReasonSelect, setting countedNumberOfPacks = 0 on every selected line. The server enforces whether
// a reason is required; an unmet requirement comes back as the modal's error phase (→ Show error
// lines). Owns its open + picker state.
export const ReduceToZeroAction: Component<ReduceToZeroActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [reasonId, setReasonId] = createSignal<string | null>(null);

  const run = async (): Promise<SelectionActionResult> => {
    const result = await updateStocktakeLines(
      props.storeId,
      props.selectedIds().map((id) => ({ id, countedNumberOfPacks: 0, reasonOptionId: reasonId() })),
    );
    if (result.kind === 'failed') return { kind: 'ok' };
    props.onUpdated(result.updated);
    if (result.kind === 'partial') {
      props.onError(result.error.message, result.error.lineIds);
      return { kind: 'error', message: result.error.message, lineIds: result.error.lineIds };
    }
    return { kind: 'ok' };
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<MinusCircleIcon />}
        disabled={props.disabled}
        onClick={() => {
          setReasonId(null);
          setOpen(true);
        }}
      >
        {t('stocktake.lines.reduce-to-zero')}
      </Button>
      <SelectionActionModal
        open={open()}
        onClose={() => setOpen(false)}
        icon={<MinusCircleIcon />}
        title={t('stocktake.lines.reduce-to-zero-title')}
        confirmLabel={t('common.apply')}
        confirmIcon={<CheckIcon />}
        run={run}
        successMessage={t('stocktake.lines.reduce-to-zero-success')}
        onShowErrors={props.onShowErrors}
      >
        <p>{t('stocktake.lines.reduce-to-zero-message')}</p>
        <FieldRow label={t('stocktake.line-edit.reason')}>
          <ReasonSelect
            kind="reduction"
            label={t('stocktake.line-edit.reason')}
            hideLabel
            value={reasonId() ?? undefined}
            placeholder={t('stocktake.line-edit.reason-select')}
            onChange={(r) => setReasonId(r?.id ?? null)}
          />
        </FieldRow>
      </SelectionActionModal>
    </>
  );
};
