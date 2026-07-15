import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { runBatchStocktakeLines, type LineEditCommit } from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';

export interface DeleteLinesActionProps {
  storeId: string;
  /** The currently-selected line ids. */
  selectedIds: () => string[];
  /** Disabled while the stocktake is finalised / on hold. */
  disabled: boolean;
  /** Apply what committed in place (the deleted ids drop from rows + selection, no refetch). */
  onCommit: (commit: LineEditCommit) => void;
  /** Partial failure — stamp the per-line errors (lineId → typename) and jump to those rows. */
  onError: (errors: LineErrors) => void;
}

// The Delete-lines selection action: its footer button + a confirm → working dialog.
//
// Written inline (not via a shared ActionModal) so the whole flow is readable in one place
// (kdd/explicit-composition). On resolution the modal always closes: the deleted ids drop from the
// rows via onCommit, and any line that couldn't be deleted surfaces on the detail rows via onError.
// The phase lives in <Body>, mounted only while open (fresh per open; a late run() lands on a
// disposed scope).
export const DeleteLinesAction: Component<DeleteLinesActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);
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
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteLinesActionProps & { onClose: () => void }) => {
  const [working, setWorking] = createSignal(false);

  const run = async () => {
    if (working()) return; // re-entry guard
    setWorking(true);
    const outcome = await runBatchStocktakeLines(props.storeId, {
      delete: props.selectedIds().map((id) => ({ id })),
    });
    if (outcome) {
      props.onCommit(outcome.commit);
      if (outcome.errors.size > 0) props.onError(outcome.errors);
    }
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={!working()}
      onClose={props.onClose}
      icon={<TrashIcon />}
      title={t('stocktake.lines.delete-title')}
      description={t('stocktake.lines.delete-confirm', { count: props.selectedIds().length })}
      actions={
        <>
          <Show when={!working()}>
            <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
              {t('common.cancel')}
            </Button>
          </Show>
          <Button variant="secondary" icon={<TrashIcon />} loading={working()} onClick={() => void run()}>
            {t('common.delete')}
          </Button>
        </>
      }
    />
  );
};
