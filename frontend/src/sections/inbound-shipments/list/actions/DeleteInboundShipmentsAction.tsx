import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { DeleteInboundShipments } from '../inboundShipments.generated';

export interface DeleteInboundShipmentsActionProps {
  storeId: string;
  selectedIds: () => string[];
  onDeleted: () => void;
  /** Shown disabled (with a reason tooltip on the wrapper) when true. */
  disabled?: boolean;
}

// The inbound-shipments-list bulk delete (spec AC-L3): footer button + a
// confirm → deleting → success | error dialog. Mirrors DeleteStocktakesAction.
// The server is the source of truth (the list only OFFERS delete when every
// selected row is New — a UI narrowing). The batch is atomic (AC-BA1): if any
// row can't be deleted the whole batch fails and nothing is removed, so on
// error we show the server's reason (a per-line lock can surface here too, per
// rules → deletion). Success reports the count; the list clears selection +
// re-queries.
type Phase = 'confirm' | 'deleting' | 'success' | 'error';

export const DeleteInboundShipmentsAction: Component<
  DeleteInboundShipmentsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        disabled={props.disabled}
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
  props: DeleteInboundShipmentsActionProps & { onClose: () => void }
) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const result = await graphqlFetch(DeleteInboundShipments, {
      storeId: props.storeId,
      ids: props.selectedIds().map(id => ({ id })),
    });
    if (result.kind !== 'success') {
      setPhase('confirm');
      return;
    }
    const items = result.data.batchInboundShipment.deleteInboundShipments ?? [];
    const firstError = items.find(
      i => i.response.__typename === 'DeleteInboundShipmentError'
    );
    if (
      firstError &&
      firstError.response.__typename === 'DeleteInboundShipmentError'
    ) {
      setErrorMessage(firstError.response.error.description);
      setPhase('error');
      return;
    }
    props.onDeleted();
    setPhase('success');
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
        <Switch fallback={tPlural('messages.confirm-delete-shipments', count)}>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{errorMessage()}</Alert>
          </Match>
          <Match when={phase() === 'success'}>
            {tPlural('messages.deleted-shipments', count)}
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
                  confirms="cancel"
                  onClick={props.onClose}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<TrashIcon />}
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
          <Match when={phase() === 'success'}>
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              confirms="plain"
              onClick={props.onClose}
            >
              {t('button.ok')}
            </Button>
          </Match>
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
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
