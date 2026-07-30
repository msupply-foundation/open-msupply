import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { TrashIcon } from '../../../../ui/icons';
import { deleteInboundShipment } from '../inboundShipmentUpdate';

export interface DeleteInboundShipmentActionProps {
  storeId: string;
  invoiceId: string;
  isExternal: boolean;
  /** Shipment number — for the confirmation copy ("Shipment #N"). */
  number: () => number;
  /** The client offers delete only while New (spec → deletion UI narrowing). */
  disabled: boolean;
  /** Deleted — the view leaves for the list. */
  onDeleted: () => void;
}

// Record-level delete from the detail side panel (spec S3 → side panel). The
// client narrows delete to New (a UI narrowing of the server's wider window);
// the server still cascades to lines + stock and is the source of truth. No
// success phase — on success we navigate away (onDeleted). A per-line lock can
// surface here (the whole delete fails), shown as the server's reason.
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteInboundShipmentAction: Component<
  DeleteInboundShipmentActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-shipment-button"
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
  props: DeleteInboundShipmentActionProps & { onClose: () => void }
) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const result = await deleteInboundShipment(
      props.storeId,
      props.isExternal,
      props.invoiceId
    );
    if (result.ok) return props.onDeleted();
    if (result.message) {
      setErrorMessage(result.message);
      setPhase('error');
      return;
    }
    // transport failure → global modal already showed it; reset.
    setPhase('confirm');
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
        <Switch
          fallback={t('messages.confirm-delete-shipment', {
            number: props.number(),
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
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
              </Show>
              <Button
                variant="danger"
                data-testid="confirmation-modal-ok"
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.delete')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Button variant="secondary" onClick={props.onClose}>
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
