import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
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
// single untyped top-level error (contract § editing and deleting lines).
//
// Because it is untyped there is nothing to branch on, so the error phase does
// NOT name a cause: it states the refusal generically and puts the server's own
// text behind a disclosure. It previously hard-coded "cannot be deleted from a
// finalised stock movement", which reported the wrong reason for every other
// rejection that lands here. Permission denials are separated out first — those
// owe the user the global permission-denied modal (D38), which opting into
// GraphQL errors would otherwise swallow. Success closes — closure is the
// confirmation (D21).
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
  // The server's own text, behind a disclosure — the refusal arrives untyped.
  const [errorDetail, setErrorDetail] = createSignal<string>();
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
      // A permission denial is not a delete refusal — hand it to the global
      // permission-denied modal (D38) and close, as the default path would.
      if (isForbidden(result.errors)) {
        reportPermissionDenied(missingPermissions(result.errors));
        props.onClose();
        return;
      }
      setErrorDetail(result.message);
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
      // The title tracks the phase — a rejection is not a question
      // (kdd/action-modal).
      title={
        phase() === 'error'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
      description={
        <Show
          when={phase() === 'error'}
          fallback={tPlural(
            'messages.confirm-delete-stock-movement-lines',
            count
          )}
        >
          <Alert severity="error">
            {t('messages.cant-delete-generic')}
            <Show when={errorDetail()}>
              {detail => <ErrorDetails detail={detail()} />}
            </Show>
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
          {/* Nothing was deleted, so there is nothing to cancel — the error
              phase is acknowledged, not aborted. */}
          <Button variant="secondary" confirms="plain" onClick={props.onClose}>
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
