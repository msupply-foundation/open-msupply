import {
  createSignal,
  For,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { TrashIcon } from '../../../../ui/icons';
import { DeleteOutboundShipments } from '../outboundShipments.generated';

export interface DeleteShipmentsActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** Deletion succeeded — clear the selection and re-query. */
  onDeleted: () => void;
}

// The list's bulk delete (spec S1 bulk actions, OMS-REG-DIST-01.23). Offered
// for any selection: deletability is the admissibility of an action, not a
// standing property of the rows, so the batch is SUBMITTED and the server's own
// reason surfaced here rather than pre-screened (validation.md § actions;
// issue #1134).
//
// Submitting a mixed selection is safe because the batch is ATOMIC. The server
// runs every row inside one transaction with `continue_on_error` defaulting to
// false, and the first failure returns `Err(WithDBError::err(results))`, which
// rolls the transaction back — then unwraps that error back into a normal
// response, so the client receives each row's own typed rejection with the
// database untouched (server service/src/invoice/outbound_shipment/batch.rs).
// Nothing is ever partially deleted.
//
// Each failed row carries a translated `error.description`, so the refusal
// names its cause instead of a blanket notice — one notice per DISTINCT reason,
// since N rows refused for the same cause is one thing to say, not N.
//
// No success phase: a clean delete CLOSES the dialog — closure is the
// confirmation and the shorter list behind it is the visible result
// (spec/ui-standards/controls.md § dialogs, D22; § action feedback, D21).
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteShipmentsAction: Component<
  DeleteShipmentsActionProps
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
        {t('label.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteShipmentsActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // Each refused row's reason, deduplicated for the report.
  const [reasons, setReasons] = createSignal<string[]>([]);
  // Snapshotted on open so the message can't shift behind the dialog.
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteOutboundShipments, {
      storeId: props.storeId,
      ids: props.selectedIds(),
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global modal already surfaced it.
      setPhase('confirm');
      return;
    }
    const items =
      result.data.batchOutboundShipment.deleteOutboundShipments ?? [];
    const refused = [
      ...new Set(
        items.flatMap(item =>
          item.response.__typename === 'DeleteOutboundShipmentError'
            ? [item.response.error.description]
            : []
        )
      ),
    ];
    if (refused.length > 0) {
      // The batch rolled back, so nothing went — the report is the reasons
      // alone, with no count of what survived.
      setReasons(refused);
      setPhase('error');
      return;
    }
    // Success: close first, then hand back to the list — onDeleted clears the
    // selection, which unmounts the selection-gated footer this dialog lives
    // in.
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
      // The error phase is no longer a question, so the heading stops asking
      // one (it would otherwise read "Are you sure?" over a rejection).
      title={
        phase() === 'error'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
      description={
        <Switch fallback={tPlural('messages.confirm-delete-shipments', count)}>
          <Match when={phase() === 'error'}>
            {/* The description slot is a single <p> with no rhythm of its own,
                so the gap between notices comes from Stack. */}
            <Stack gap="sm">
              <For each={reasons()}>
                {reason => (
                  <Alert severity="error" testId="shipment-delete-refused">
                    {reason}
                  </Alert>
                )}
              </For>
            </Stack>
          </Match>
        </Switch>
      }
      actions={
        <Switch
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
                {t('label.delete')}
              </Button>
            </>
          }
        >
          {/* Nothing was deleted, so there is nothing to cancel — the error
              phase is acknowledged, not aborted. */}
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              confirms="plain"
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
