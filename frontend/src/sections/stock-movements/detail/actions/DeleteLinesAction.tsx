import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { BatchStockMovementLine } from '../edit-modal/batchStockMovementLine.generated';

export interface DeleteLinesActionProps {
  storeId: string;
  movementId: string;
  selectedLineIds: () => string[];
  /** Deletion succeeded — the view clears the selection and refetches. */
  onDeleted: () => void;
}

// Bulk line delete from the selection footer (spec/stock-movements/
// ui-surface.md S2 § status footer — the bulk-action bar; rules § editing and
// deleting lines; OMS-REG-SMV-10.31). One batch, deletes only, default
// all-or-nothing: any rejection (a finalised document — .26) arrives as a
// single untyped top-level error (contract § editing and deleting lines), so
// the error phase shows OUR translated refusal. Success closes — closure is
// the confirmation (D21).
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
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

const Body = (props: DeleteLinesActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const count = props.selectedLineIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const result = await graphqlFetch(
      BatchStockMovementLine,
      {
        storeId: props.storeId,
        input: { delete: props.selectedLineIds() },
      },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'graphqlError') {
      setPhase('error');
      return;
    }
    if (result.kind !== 'success') {
      setPhase('confirm');
      return;
    }
    props.onClose();
    props.onDeleted();
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
        <Show
          when={phase() === 'error'}
          fallback={tPlural(
            'messages.confirm-delete-stock-movement-lines',
            count
          )}
        >
          <Alert severity="error">
            {t('messages.cant-delete-finalised-stock-movement-lines')}
          </Alert>
        </Show>
      }
      actions={
        <Show
          when={phase() === 'error'}
          fallback={
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton onClick={props.onClose} />
              </Show>
              <Button
                variant="danger"
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <CancelButton onClick={props.onClose} />
        </Show>
      }
    />
  );
};
