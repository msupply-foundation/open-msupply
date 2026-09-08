import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { graphqlFetch, reportPermissionDenied } from '@/api/graphql';
import { hasPermission } from '@/store/storeContext';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteAsset } from '../../equipment.generated';

// The list's bulk delete (ui-surface S1 § layout, S7): the selection-footer
// button and its confirmation (AC-X2).
//
// Deleting is a WITHDRAWAL, not an erasure — the record stops being listed but
// is not destroyed, and its status history and documents survive it (rules ›
// deletion). The confirmation's own wording says "permanently remove", which
// describes neither half; it is the copy the catalog carries, cited as found.
//
// There is no bulk mutation: each asset is deleted on its own, so a failure
// part-way leaves the earlier ones gone. The dialog reports what happened
// rather than pretending the batch was atomic.
type Phase = 'confirm' | 'deleting' | 'error';

export interface DeleteAssetsActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** Deletion finished — the list clears its selection and re-queries. */
  onDeleted: () => void;
}

export const DeleteAssetsAction: Component<DeleteAssetsActionProps> = props => {
  const [open, setOpen] = createSignal(false);

  const onClick = () => {
    // Deleting needs ASSET_MUTATE; without it the user is told rather than
    // shown a dead control (AC-G2).
    if (!hasPermission('ASSET_MUTATE')) {
      reportPermissionDenied(['AssetMutate']);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={onClick}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteAssetsActionProps & { onClose: () => void }) => {
  // Body mounts once per open, so the selection is snapshotted here — the
  // footer's own selection clears as rows go.
  const ids = props.selectedIds();
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [failed, setFailed] = createSignal(0);

  const remove = async () => {
    setPhase('deleting');
    let failures = 0;
    for (const assetId of ids) {
      const result = await graphqlFetch(DeleteAsset, {
        storeId: props.storeId,
        assetId,
      });
      if (result.kind !== 'success') failures += 1;
    }
    // Whatever happened, the list must re-read: the successes are gone.
    props.onDeleted();
    if (failures === 0) {
      props.onClose();
      return;
    }
    setFailed(failures);
    setPhase('error');
  };

  return (
    <Dialog
      open
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      dismissable={phase() !== 'deleting'}
      onClose={props.onClose}
      actions={
        <Switch>
          <Match when={phase() === 'error'}>
            <Button variant="primary" onClick={props.onClose}>
              {t('button.close')}
            </Button>
          </Match>
          <Match when={phase() !== 'error'}>
            <Show when={phase() !== 'deleting'}>
              <CancelButton
                data-testid="dialog-button-cancel"
                onClick={props.onClose}
              />
            </Show>
            <Button
              variant="danger"
              data-testid="confirmation-modal-ok"
              loading={phase() === 'deleting'}
              disabled={phase() === 'deleting'}
              onClick={() => void remove()}
            >
              {t('button.ok')}
            </Button>
          </Match>
        </Switch>
      }
    >
      <Switch>
        <Match when={phase() === 'error'}>
          <Alert severity="error">
            {t('error.unable-to-save-asset')} ({failed()})
          </Alert>
        </Match>
        <Match when={phase() !== 'error'}>
          {tPlural('messages.confirm-delete-assets', ids.length, {
            count: ids.length,
          })}
        </Match>
      </Switch>
    </Dialog>
  );
};
