import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { deleteReturn } from '../../detail/returnUpdate';

export interface DeleteReturnsActionProps {
  storeId: string;
  /** The currently-selected return ids. */
  selectedIds: () => string[];
  /** Some/all deletions succeeded — clear selection and re-query. */
  onDeleted: () => void;
}

// The returns-list bulk delete (spec/customer-returns/acceptance.md AC-D1/D2;
// the reference DeleteStocktakesAction shape). There is NO batch mutation for
// customer returns, so this runs one deleteCustomerReturn per id — NOT atomic:
// a VERIFIED return in the selection fails (every rejection non-typed —
// contract § deletion wire trap) while the others delete. The error phase says
// some couldn't be deleted; the list re-queries either way so the deleted rows
// disappear.
type Phase = 'confirm' | 'deleting' | 'success' | 'error';

export const DeleteReturnsAction: Component<
  DeleteReturnsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteReturnsActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [deletedCount, setDeletedCount] = createSignal(0);
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    let deleted = 0;
    let failed = 0;
    // Sequential, one per id — keeps the outcome per row unambiguous.
    for (const id of props.selectedIds()) {
      const result = await deleteReturn(props.storeId, id);
      if (result.kind === 'deleted') deleted += 1;
      else if (result.kind === 'forbidden') {
        // A standing permission block — the global permission-denied modal is
        // already showing (D38) and every remaining row would fail the same
        // way. Commit any rows deleted before it and close this dialog rather
        // than stacking the generic "couldn't delete" notice on top.
        if (deleted > 0) props.onDeleted();
        props.onClose();
        return;
      } else failed += 1;
    }
    setDeletedCount(deleted);
    if (deleted > 0) props.onDeleted();
    setPhase(failed > 0 ? 'error' : 'success');
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'deleting'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Switch fallback={tPlural('messages.confirm-delete-returns', count)}>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{t('messages.cant-delete-generic')}</Alert>
          </Match>
          <Match when={phase() === 'success'}>
            {tPlural('messages.deleted-generic', deletedCount())}
          </Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            <>
              <Show when={phase() === 'confirm'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={props.onClose}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<TrashIcon />}
                data-testid="confirmation-modal-ok"
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'success' || phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              onClick={props.onClose}
            >
              {t('button.ok')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
