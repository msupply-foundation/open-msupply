import { createSignal, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { TrashIcon } from '../../../ui/icons';
import { ActionModal, type ActionResult } from '../../../domain/action';
import { deleteStocktakeLines } from '../stocktakeLineUpdate';

export interface DeleteLinesActionProps {
  storeId: string;
  /** The currently-selected line ids. */
  selectedIds: () => string[];
  /** Disabled while the stocktake is finalised / on hold. */
  disabled: boolean;
  /** The lines that were deleted — the view drops them from its rows + selection (no refetch). */
  onDeleted: (deletedIds: string[]) => void;
  /** A partial failure — stamp the per-line error (inline + errors chip). */
  onError: (message: string, lineIds: string[]) => void;
  /** Apply the errors-only filter to the offending lines (the error phase's "Show error lines"). */
  onShowErrors: (lineIds: string[]) => void;
}

// The Delete-lines selection action: its footer button + confirm → working → success | error modal
// (ActionModal). Owns its open state; the view owns rows/selection and applies the result
// via the callbacks. A partial failure stamps the errors and offers "Show error lines".
export const DeleteLinesAction: Component<DeleteLinesActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);

  const run = async (): Promise<ActionResult> => {
    const result = await deleteStocktakeLines(props.storeId, props.selectedIds());
    if (result.kind === 'failed') return { kind: 'ok' };
    props.onDeleted(result.deletedIds);
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
