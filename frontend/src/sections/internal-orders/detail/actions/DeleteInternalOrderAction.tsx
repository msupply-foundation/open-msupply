import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { deleteInternalOrder } from '../internalOrderUpdate';

// The side-panel "Delete" action (spec S5 → S6, AC-D1): the button plus a
// confirm → deleting → error dialog, modelled on DeleteStocktakeAction. The
// button is shown disabled unless the order is editable (Draft) — the server
// rejects a non-Draft delete anyway, but the gate reads as unavailable rather
// than failing on confirm. A successful delete hands control to the view
// (onDeleted), which navigates to the list, so there is no success phase.
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteInternalOrderAction: Component<{
  storeId: string;
  orderId: string;
  /** The order number, shown in the confirm copy. */
  orderNumber: number;
  /** Draft-and-enabled gate — disables the button off Draft. */
  disabled: boolean;
  /** Deleted — the view leaves for the list (with a replaced history entry). */
  onDeleted: () => void;
}> = props => {
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const close = () => {
    setOpen(false);
    setPhase('confirm');
    setErrorMessage(undefined);
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const result = await deleteInternalOrder(props.storeId, props.orderId);
    if (result.kind === 'deleted') {
      props.onDeleted();
      return;
    }
    if (result.kind === 'error') {
      setErrorMessage(result.message);
      setPhase('error');
      return;
    }
    // transport/unexpected → global modal already surfaced it; reset.
    setPhase('confirm');
  };

  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-internal-order-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete')}
      </Button>
      <Show when={open()}>
        <Dialog
          open
          dismissable={phase() !== 'deleting'}
          onClose={close}
          icon={<TrashIcon />}
          testId="confirmation-modal"
          title={t('heading.are-you-sure')}
          description={
            <Switch
              fallback={t('messages.confirm-delete-requisition', {
                number: props.orderNumber,
              })}
            >
              <Match when={phase() === 'error'}>
                <Alert severity="error">{errorMessage()}</Alert>
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
                      onClick={close}
                    >
                      {t('button.cancel')}
                    </Button>
                  </Show>
                  <Button
                    variant="danger"
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
              <Match when={phase() === 'error'}>
                <Button
                  variant="secondary"
                  icon={<CheckIcon />}
                  confirms="plain"
                  onClick={close}
                >
                  {t('button.close')}
                </Button>
              </Match>
            </Switch>
          }
        />
      </Show>
    </>
  );
};
