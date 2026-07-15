import { createSignal, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { TrashIcon } from '../../../ui/icons';
import { ActionModal, type ActionResult } from '../../../domain/action';
import { runBatchStocktakeLines, type LineEditCommit } from '../stocktakeLineUpdate';
import type { LineErrors } from '../stocktakeLineErrors';
import { lineActionResult } from './lineActionResult';

export interface DeleteLinesActionProps {
  storeId: string;
  /** The currently-selected line ids. */
  selectedIds: () => string[];
  /** Disabled while the stocktake is finalised / on hold. */
  disabled: boolean;
  /** Apply what committed in place (the deleted ids drop from rows + selection, no refetch). */
  onCommit: (commit: LineEditCommit) => void;
  /** Stamp the per-line errors (lineId → typename) so the failed rows show them. */
  onErrors: (errors: LineErrors) => void;
  /** Apply the errors-only filter to the offending lines (the error phase's "Show error lines"). */
  onShowErrors: (lineIds: string[]) => void;
}

// The Delete-lines selection action: its footer button + confirm → working → success | error modal
// (ActionModal). Owns its open state; the view owns rows/selection and applies the result via the
// callbacks (onCommit + onErrors). A partial failure stamps the errors and offers "Show error lines".
export const DeleteLinesAction: Component<DeleteLinesActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);

  const run = async (): Promise<ActionResult> => {
    const outcome = await runBatchStocktakeLines(props.storeId, {
      delete: props.selectedIds().map((id) => ({ id })),
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
        icon={<TrashIcon />}
        disabled={props.disabled}
        onClick={() => setOpen(true)}
      >
        {t('common.delete')}
      </Button>
      <ActionModal
        open={open()}
        onClose={() => setOpen(false)}
        icon={<TrashIcon />}
        title={t('stocktake.lines.delete-title')}
        confirmLabel={t('common.delete')}
        confirmIcon={<TrashIcon />}
        run={run}
        successMessage={t('stocktake.lines.delete-success')}
        onShowErrors={props.onShowErrors}
      >
        {t('stocktake.lines.delete-confirm', { count: props.selectedIds().length })}
      </ActionModal>
    </>
  );
};
