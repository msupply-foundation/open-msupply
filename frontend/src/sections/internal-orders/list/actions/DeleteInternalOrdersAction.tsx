import { createSignal, Show, Switch, Match, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { DeleteInternalOrders } from '../internalOrders.generated';

export interface DeleteInternalOrdersActionProps {
  storeId: string;
  /** The currently-selected order ids. */
  selectedIds: () => string[];
  /**
   * Deletion succeeded — the list clears its selection and re-queries so the
   * rows disappear.
   */
  onDeleted: () => void;
  /**
   * Whether EVERY selected order may be deleted (Draft + supplier-store
   * enabled). The button stays clickable regardless; when this is false the
   * click surfaces the "only Draft orders can be deleted" explanation instead
   * of a confirmation, and nothing is submitted (AC-D3).
   */
  canDelete: () => boolean;
}

// The internal-orders-list bulk delete (spec AC-D1/D3): footer button + a
// blocked | confirm → deleting → error dialog. Unlike the inbound/stocktakes
// lists (whose delete is visible-DISABLED beside the row's status —
// ui-standards controls.md § blocked affordances, "actionable block"), AC-D3
// picks the "needs words → active-and-explaining" pattern: the button stays
// clickable and a click on a selection that includes a non-Draft (or
// disabled-supplier-store) order opens the dialog already explaining why it
// can't proceed — never a silently dead click. When every selected order is
// deletable the click opens the confirmation instead. The server enforces the
// same guard regardless. The batch is ATOMIC: any member error rolls the whole
// batch back and nothing is removed, so on error we show the server's reason
// with just a Close, keeping the selection (the footer, and this dialog, stay
// mounted). Success closes the dialog and hands back to the list — closure is
// the confirmation, no announcement follows (ui-standards controls.md §
// dialogs / § action feedback).
type Phase = 'blocked' | 'confirm' | 'deleting' | 'error';

export const DeleteInternalOrdersAction: Component<
  DeleteInternalOrdersActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (
  props: DeleteInternalOrdersActionProps & { onClose: () => void }
) => {
  // Body mounts once per open, so the opening state is snapshotted here:
  // whether the selection is deletable picks the initial phase (blocked vs
  // confirm), and the count freezes so the confirm message can't shift if the
  // selection changes behind the dialog.
  const [phase, setPhase] = createSignal<Phase>(
    props.canDelete() ? 'confirm' : 'blocked'
  );
  const [errorMessage, setErrorMessage] = createSignal<string>();
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteInternalOrders, {
      storeId: props.storeId,
      ids: props.selectedIds().map(id => ({ id })),
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global error modal already surfaced it; drop
      // back to confirm so the dialog isn't left stuck loading.
      setPhase('confirm');
      return;
    }
    const items =
      result.data.batchRequestRequisition.deleteRequestRequisitions ?? [];
    // Judge the batch by whether ANY member errored — a validating member still
    // reports DeleteResponse on a rolled-back batch (contract › deletion wire
    // trap), so a per-member "success" is not proof.
    const firstError = items.find(
      i => i.response.__typename === 'DeleteRequestRequisitionError'
    );
    if (
      firstError &&
      firstError.response.__typename === 'DeleteRequestRequisitionError'
    ) {
      setErrorMessage(firstError.response.error.description);
      setPhase('error');
      return;
    }
    // Success: close (closure is the confirmation), then hand back to the list.
    // onDeleted clears the selection, which unmounts the selection-gated footer
    // this dialog lives in — so it must come last, after the dialog is closed.
    props.onClose();
    props.onDeleted();
  };

  return (
    <Dialog
      open
      // Blocking while the mutation is in flight — no click-outside / Escape
      // exit until it resolves.
      dismissable={phase() !== 'deleting'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Switch fallback={tPlural('messages.confirm-delete-internal-orders', count)}>
          {/* Blocked: a non-Draft (or disabled-store) order is in the selection
              — explain why, and never submit (AC-D3). */}
          <Match when={phase() === 'blocked'}>
            <Alert severity="warning">{t('messages.delete-only-draft')}</Alert>
          </Match>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{errorMessage()}</Alert>
          </Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            // confirm / deleting: Cancel (hidden while deleting) + the loading
            // Delete.
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
          {/* Blocked / error: nothing to submit — a single Close. */}
          <Match when={phase() === 'blocked' || phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              onClick={props.onClose}
            >
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
