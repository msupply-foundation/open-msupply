import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { ErrorDetails } from '../../../../ui/elements/feedback/ErrorDetails';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { TrashIcon } from '../../../../ui/icons';
import { deleteInboundShipment } from '../inboundShipmentUpdate';

export interface DeleteInboundShipmentActionProps {
  storeId: string;
  invoiceId: string;
  isExternal: boolean;
  /** Shipment number — for the confirmation copy ("Shipment #N"). */
  number: () => number;
  /**
   * Whether this shipment has already introduced stock (anything past New) —
   * the confirmation says so, because that stock goes with it.
   */
  removesStock: () => boolean;
  /** Deleted — the view leaves for the list. */
  onDeleted: () => void;
}

// Record-level delete from the detail side panel (spec S3 → side panel).
// Offered at every status: deletability is the admissibility of an action, not
// a standing property of the shipment, so it is SUBMITTED and the server's own
// reason surfaced here rather than pre-screened (validation.md § actions;
// issue #1134) — and it matches the list's bulk delete, which is the same
// action on the same record.
//
// Past New the delete REVERSES the receipt: the server cascades to the lines
// and the stock they created, refusing per-line once any of that stock has been
// issued, reserved, counted in a stocktake or arrived by transfer. So it is
// warned about, not blocked. No success phase — on success we navigate away
// (onDeleted).
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
  // The raw server text behind a disclosure, when the refusal arrived untyped.
  const [errorDetail, setErrorDetail] = createSignal<string>();
  // Snapshotted on open so it can't shift behind the open dialog.
  const removesStock = props.removesStock();

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const result = await deleteInboundShipment(
      props.storeId,
      props.isExternal,
      props.invoiceId
    );
    if (result.ok) return props.onDeleted();
    // A permission block already raised the global modal (D38) — close, rather
    // than stacking an inline rejection under it.
    if (result.forbidden) return props.onClose();
    if (result.message) {
      setErrorMessage(result.message);
      setErrorDetail(result.detail);
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
      // The title tracks the phase — a rejection is not a question
      // (kdd/action-modal).
      title={
        phase() === 'error'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
      description={
        <Switch
          fallback={
            <Stack gap="sm">
              {t('messages.confirm-delete-shipment', {
                number: props.number(),
              })}
              {/* Receipt reversal — informational, so the confirm still
                  submits (validation.md § actions). */}
              <Show when={removesStock}>
                <Alert severity="warning" testId="delete-removes-stock">
                  {t('messages.delete-removes-received-stock')}
                </Alert>
              </Show>
            </Stack>
          }
        >
          <Match when={phase() === 'error'}>
            <Alert severity="error">
              {errorMessage()}
              <Show when={errorDetail()}>
                {detail => <ErrorDetails detail={detail()} />}
              </Show>
            </Alert>
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
                confirms="plain"
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
