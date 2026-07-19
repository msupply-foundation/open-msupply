import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, CopyIcon, XCircleIcon } from '../../../../ui/icons';
import { DuplicateOutboundShipment } from '../outboundShipments.generated';

export interface DuplicateShipmentActionProps {
  /** The shipment to copy. */
  shipmentId: () => string;
  /**
   * Where the trigger renders: the list footer's bulk bar (secondary tone,
   * default) or the detail side panel's record-actions stack (primary, like
   * the page actions).
   */
  variant?: 'footer' | 'panel';
}

// "Make a copy" (rules.md § duplication, AC-X1/X2): any shipment — SHIPPED
// included — copies into a fresh NEW one whose stock lines became placeholders.
// Offered for a single selection (list footer) and as a record action (detail
// side panel). Confirm → duplicate → navigate to the copy. Skipped
// inactive-catalogue items are reported in the dialog itself (controls ›
// action feedback); acknowledging the report performs the navigation — the
// follow-on happens after the close (controls › dialogs).
type Phase = 'confirm' | 'working' | 'skipped';

export const DuplicateShipmentAction: Component<
  DuplicateShipmentActionProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [skippedCount, setSkippedCount] = createSignal(0);
  const [copyId, setCopyId] = createSignal<string>();

  const openConfirm = () => {
    setPhase('confirm');
    setConfirmOpen(true);
  };
  const close = () => setConfirmOpen(false);

  const goToCopy = (id: string) =>
    navigate(`/${params.storeId}/distribution/outbound-shipment/${id}`);

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('working');
    const result = await graphqlFetch(
      DuplicateOutboundShipment,
      { storeId: params.storeId, id: props.shipmentId() },
      {
        // Inactive customer (or any typed rejection) → surface the server's
        // description; there is nothing for the user to fix in place.
        mapSuccessToError: data =>
          data.duplicateOutboundShipment.__typename ===
          'DuplicateOutboundShipmentError'
            ? data.duplicateOutboundShipment.error.description
            : undefined,
      }
    );
    if (result.kind !== 'success') return close();
    const response = result.data.duplicateOutboundShipment;
    if (response.__typename !== 'DuplicateOutboundShipmentNode') return close();
    if (response.skippedItemCount > 0) {
      // Items no longer in the catalogue were not copied — report before
      // navigating, in the initiating dialog rather than a toast (D19).
      setSkippedCount(response.skippedItemCount);
      setCopyId(response.invoice.id);
      setPhase('skipped');
      return;
    }
    goToCopy(response.invoice.id);
  };

  return (
    <>
      <Button
        variant={props.variant === 'panel' ? 'primary' : 'secondary'}
        icon={<CopyIcon />}
        data-testid="duplicate-shipment-button"
        onClick={openConfirm}
      >
        {t('outbound.copy.action')}
      </Button>
      <Show when={confirmOpen()}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={<CopyIcon />}
          testId="confirmation-modal"
          title={t('outbound.copy.title')}
          description={
            <Show
              when={phase() !== 'skipped'}
              fallback={
                <Alert severity="warning">
                  {tPlural('outbound.copy.skipped', skippedCount())}
                </Alert>
              }
            >
              {t('outbound.copy.confirm')}
            </Show>
          }
          actions={
            <Show
              when={phase() !== 'skipped'}
              fallback={
                <Button
                  variant="secondary"
                  icon={<CheckIcon />}
                  data-testid="dialog-button-ok"
                  onClick={() => {
                    const id = copyId();
                    close();
                    if (id) goToCopy(id);
                  }}
                >
                  {t('common.ok')}
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
                  {t('common.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<CheckIcon />}
                data-testid="confirmation-modal-ok"
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('common.ok')}
              </Button>
            </Show>
          }
        />
      </Show>
    </>
  );
};
