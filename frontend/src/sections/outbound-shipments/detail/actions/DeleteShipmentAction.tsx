import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { CheckIcon, TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { DeleteOutboundShipment } from '../outboundDetail.generated';

export interface DeleteShipmentActionProps {
  shipmentId: string;
  /** Deletable while NEW / ALLOCATED / PICKED (rules.md § deletion). */
  disabled: boolean;
}

// The side panel's record delete (spec S3 § record actions, OMS-REG-DIST-01.7/.8):
// confirm → delete → back to the list. Disabled (with the shared gate) once
// SHIPPED; a server rejection keeps the dialog open with the error inline
// (controls › dialogs, D20). Success navigates — the list is the confirmation.
type Phase = 'confirm' | 'working' | 'error';

export const DeleteShipmentAction: Component<
  DeleteShipmentActionProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal('');

  const openConfirm = () => {
    setPhase('confirm');
    setConfirmOpen(true);
  };
  const close = () => setConfirmOpen(false);

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('working');
    const result = await graphqlFetch(DeleteOutboundShipment, {
      storeId: params.storeId,
      id: props.shipmentId,
    });
    // Transport/unexpected → the global modal already surfaced it.
    if (result.kind !== 'success') return close();
    const response = result.data.deleteOutboundShipment;
    if (response.__typename !== 'DeleteResponse') {
      setErrorMessage(response.error.description);
      setPhase('error');
      return;
    }
    navigate(`/${params.storeId}/distribution/outbound-shipment`);
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<TrashIcon />}
        data-testid="delete-shipment-button"
        disabled={props.disabled}
        onClick={openConfirm}
      >
        {t('label.delete')}
      </Button>
      <Show when={confirmOpen()}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={<TrashIcon />}
          testId="confirmation-modal"
          title={t('heading.are-you-sure')}
          description={
            <Show
              when={phase() !== 'error'}
              fallback={<Alert severity="error">{errorMessage()}</Alert>}
            >
              {tPlural('messages.confirm-delete-shipments', 1)}
            </Show>
          }
          actions={
            <Show
              when={phase() !== 'error'}
              fallback={
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={close}
                >
                  {t('button.cancel')}
                </Button>
              }
            >
              <Show when={phase() === 'confirm'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  data-testid="dialog-button-cancel"
                  onClick={close}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<CheckIcon />}
                data-testid="confirmation-modal-ok"
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </Show>
          }
        />
      </Show>
    </>
  );
};
