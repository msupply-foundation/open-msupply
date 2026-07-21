import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, CopyIcon, XCircleIcon } from '../../../../ui/icons';
import { DuplicateOutboundShipment } from '../outboundShipments.generated';
import { hasPermission } from '../../../../store/storeContext';

export interface DuplicateShipmentActionProps {
  /** The shipment to copy. */
  shipmentId: () => string;
  /** The shipment number and customer name — for the confirmation copy. */
  number: () => number;
  customerName: () => string;
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
// side panel). Confirm → duplicate → navigate to the copy. A typed rejection
// (AC-X2's inactive customer, or any other) keeps the dialog open with the
// server's description inline — the confirmation is one of this vertical's
// dialog-surfaced actions (ui-surface S6), so its failure belongs there too,
// not the global unexpected-error modal (controls › action feedback, S6
// inline notices). Skipped inactive-catalogue items are reported in the
// dialog itself; acknowledging the report performs the navigation — the
// follow-on happens after the close (controls › dialogs).
type Phase = 'confirm' | 'working' | 'error' | 'skipped';

export const DuplicateShipmentAction: Component<
  DuplicateShipmentActionProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [skippedCount, setSkippedCount] = createSignal(0);
  const [copyId, setCopyId] = createSignal<string>();

  // Duplication needs the mutate permission. Disabled (never hidden) without it,
  // per rules.md's disable-with-reason model (the shared hasPermission is
  // reactive to the entered store).
  const canMutate = () => hasPermission('OUTBOUND_SHIPMENT_MUTATE');

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
    const result = await graphqlFetch(DuplicateOutboundShipment, {
      storeId: params.storeId,
      id: props.shipmentId(),
    });
    // Transport/unexpected → the global modal already surfaced it.
    if (result.kind !== 'success') return close();
    const response = result.data.duplicateOutboundShipment;
    if (response.__typename !== 'DuplicateOutboundShipmentNode') {
      // A typed rejection (e.g. AC-X2's inactive customer) — keep the dialog
      // open with the server's description inline, rather than promoting it
      // to the global unexpected-error/reload modal.
      setErrorMessage(response.error.description);
      setPhase('error');
      return;
    }
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
        disabled={!canMutate()}
        title={canMutate() ? undefined : t('auth.permission-denied')}
        onClick={openConfirm}
      >
        {t('button.make-a-copy')}
      </Button>
      <Show when={confirmOpen()}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={<CopyIcon />}
          testId="confirmation-modal"
          title={t('heading.are-you-sure')}
          description={
            <Show
              when={phase() !== 'skipped'}
              fallback={
                <Alert severity="warning">
                  {tPlural(
                    'messages.shipment-copied-skipped-items',
                    skippedCount()
                  )}
                </Alert>
              }
            >
              <Show
                when={phase() !== 'error'}
                fallback={<Alert severity="error">{errorMessage()}</Alert>}
              >
                {t('messages.confirm-duplicate-shipment-customer', {
                  number: props.number(),
                  customerName: props.customerName(),
                })}
              </Show>
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
                  {t('button.ok')}
                </Button>
              }
            >
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
            </Show>
          }
        />
      </Show>
    </>
  );
};
