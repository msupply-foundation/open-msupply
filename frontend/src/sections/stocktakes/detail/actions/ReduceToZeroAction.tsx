import { createSignal, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { CheckIcon, MinusCircleIcon } from '../../../../ui/icons';
import { ActionModal, type ActionResult } from '../../../../domain/action';
import { ReasonSelect } from '../../../../domain/reasonOptions';
import { runBatchStocktakeLines, type LineEditCommit } from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';
import { lineActionResult } from './lineActionResult';

export interface ReduceToZeroActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  /** Apply what committed in place (no refetch). */
  onCommit: (commit: LineEditCommit) => void;
  /** Stamp the per-line errors (lineId → typename) so the failed rows show them. */
  onErrors: (errors: LineErrors) => void;
  onShowErrors: (lineIds: string[]) => void;
}

// The Reduce-to-0 selection action: its footer button + a confirm modal with a negative-adjustment
// ReasonSelect, setting countedNumberOfPacks = 0 on every selected line. The server enforces whether
// a reason is required; an unmet requirement comes back as failed lines and lands the modal on its
// error phase (→ Show error lines). Owns its open + picker state.
export const ReduceToZeroAction: Component<ReduceToZeroActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [reasonId, setReasonId] = createSignal<string | null>(null);

  const run = async (): Promise<ActionResult> => {
    const outcome = await runBatchStocktakeLines(props.storeId, {
      update: props.selectedIds().map((id) => ({ id, countedNumberOfPacks: 0, reasonOptionId: reasonId() })),
    });
    if (outcome) {
      props.onCommit(outcome.commit);
      props.onErrors(outcome.errors);
    }
    return lineActionResult(outcome);
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
      <ActionModal
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
      </ActionModal>
    </>
  );
};
