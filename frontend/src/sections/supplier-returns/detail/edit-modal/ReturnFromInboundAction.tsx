import { createSignal, lazy, Show, Suspense, type Component } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { OkButton } from '../../../../ui/elements/buttons/StandardButtons';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { InfoIcon } from '../../../../ui/icons';

// The inbound-shipment detail's "Return selected lines" entry point into the
// supplier-return from-shipment flow (spec/supplier-returns/rules.md § from an
// originating inbound shipment; REPL-06.1–.8/.27/.28). The entry lives on the
// inbound-shipment detail (owned there) but drives the supplier-returns create
// modal, so the wiring lives here with the modal — the inbound view composes
// this one component (mirrors outbound-shipments → customer-returns).
//
// Only a shipment at DELIVERED / RECEIVED / VERIFIED can be returned (rules §
// creation — from an originating inbound shipment); at any other status the
// click surfaces the explanatory notice rather than opening the flow.

const ReturnFromShipmentModal = lazy(() =>
  import('./ReturnFromShipmentModal').then(m => ({
    default: m.ReturnFromShipmentModal,
  }))
);

const RETURNABLE = ['DELIVERED', 'RECEIVED', 'VERIFIED'];

export interface ReturnFromInboundActionProps {
  storeId: string;
  shipmentId: string;
  shipmentInvoiceNumber: number;
  /** The shipment's supplier — the return's other party. */
  supplierId: string;
  supplierName: string;
  status: string;
  /** The selected inbound lines' stock-line ids (the return's draft set). */
  stockLineIds: () => string[];
  /** Clear the shipment's line selection once the return is created. */
  onDone: () => void;
}

export const ReturnFromInboundAction: Component<
  ReturnFromInboundActionProps
> = props => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = createSignal(false);
  const [noticeOpen, setNoticeOpen] = createSignal(false);

  const returnable = () => RETURNABLE.includes(props.status);

  return (
    <>
      {/* Shown at every status (not hidden/disabled); a non-returnable status
          gets the explanatory notice instead of the flow — the blocked-
          affordance ladder (D39). */}
      <Button
        variant="secondary"
        data-testid="return-lines-button"
        onClick={() =>
          returnable() ? setModalOpen(true) : setNoticeOpen(true)
        }
      >
        {t('button.return-lines')}
      </Button>

      <Dialog
        open={noticeOpen()}
        onClose={() => setNoticeOpen(false)}
        icon={<InfoIcon />}
        title={t('heading.cannot-do-that')}
        description={t('messages.cant-return-inbound')}
        actions={
          <OkButton
            data-testid="dialog-button-ok"
            onClick={() => setNoticeOpen(false)}
          />
        }
      />

      <Show when={modalOpen()}>
        <Suspense>
          <ReturnFromShipmentModal
            open
            onClose={() => setModalOpen(false)}
            storeId={props.storeId}
            inboundShipmentId={props.shipmentId}
            inboundShipmentInvoiceNumber={props.shipmentInvoiceNumber}
            supplierId={props.supplierId}
            supplierName={props.supplierName}
            stockLineIds={props.stockLineIds}
            onCreated={returnId => {
              setModalOpen(false);
              props.onDone();
              navigate(
                `/${props.storeId}/replenishment/supplier-return/${returnId}`
              );
            }}
          />
        </Suspense>
      </Show>
    </>
  );
};
