import { createResource, createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { RadioGroup } from '../../../ui/elements/inputs/RadioGroup';
import { Select } from '../../../ui/elements/selectors/Select';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { NameSearch } from '../../../domain/name';
import type { NameOption } from '../../../domain/name';
import { XCircleIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import { inboundShipmentPreferences } from '../../../store/storeContext';
import {
  InsertInboundShipment,
  InsertInboundShipmentExternal,
  SentPurchaseOrders,
} from './createInboundShipment.generated';
import { SupplierInternalOrders } from '../detail/inboundShipmentLookups.generated';

// The inbound-shipment create flow (spec S2). Two modes:
//  - 'manual': a "Suppliers" modal with a single supplier lookup; picking a
//    supplier both confirms and creates a New shipment, navigating to detail.
//  - 'fromPurchaseOrder': list the store's Sent purchase orders; pick one and
//    choose whether to seed all its lines or none, then create the external
//    (PO-linked) shipment via the ...External twin (contract → creation wire
//    trap: purchaseOrderId REQUIRES the external mutation).
//
// KNOWN SIMPLIFICATION (flagged): the spec's intermediate "link an open
// internal order for this supplier" step (offered when the store allows manual
// internal-order linking) is not built here — creation goes straight through.
// The internal-order LINK is still reachable later via the detail toolbar's
// "Add from internal order". See the section README delta.

export interface CreateInboundShipmentModalProps {
  open: boolean;
  mode: 'manual' | 'fromPurchaseOrder';
  onClose: () => void;
}

export const CreateInboundShipmentModal: Component<
  CreateInboundShipmentModalProps
> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<CreateInboundShipmentModalProps> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const goToShipment = (id: string) => {
    props.onClose();
    navigate(`/${params.storeId}/replenishment/inbound-shipment/${id}`);
  };

  // ── Manual: pick a supplier, optionally link an open internal order, create
  // (spec S2). When the store allows manual internal-order linking AND the
  // chosen supplier has open internal orders, an intermediate step offers
  // linking one before creation; otherwise creation is immediate.
  const [supplier, setSupplier] = createSignal<NameOption | null>(null);
  const [linkRequisitionId, setLinkRequisitionId] = createSignal<string>();
  const canLinkOrders = () =>
    inboundShipmentPreferences().manuallyLinkInternalOrderToInboundShipment;

  const [ordersData] = createResource(
    () => (canLinkOrders() && supplier() ? supplier()!.id : undefined),
    async otherPartyId => {
      const result = await graphqlFetch(SupplierInternalOrders, {
        storeId: params.storeId,
        otherPartyId,
      });
      return result.kind === 'success' &&
        result.data.requisitions.__typename === 'RequisitionConnector'
        ? result.data.requisitions.nodes
        : [];
    }
  );
  const internalOrders = () => ordersData() ?? [];
  // The link step shows only once a supplier is chosen and the store allows
  // linking (the picker inside lists any open orders, or notes there are none).
  const showLinkStep = () => canLinkOrders() && !!supplier();

  const create = async (otherPartyId: string, requisitionId?: string) => {
    if (creating()) return;
    setCreating(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(InsertInboundShipment, {
      storeId: params.storeId,
      input: { id: crypto.randomUUID(), otherPartyId, requisitionId },
    });
    setCreating(false);
    if (result.kind !== 'success') return; // global modal already showed it
    const response = result.data.insertInboundShipment;
    if (response.__typename === 'InvoiceNode') return goToShipment(response.id);
    if (response.__typename === 'InsertInboundShipmentError')
      setErrorMessage(response.error.description);
  };

  const onSupplierSelect = (chosen: NameOption | null) => {
    setSupplier(chosen);
    // No link step → create straight away (spec S2 default manual flow).
    if (chosen && !canLinkOrders()) void create(chosen.id);
  };

  // ── From a purchase order ─────────────────────────────────────────────────
  const [selectedPoId, setSelectedPoId] = createSignal<string>();
  const [seedLines, setSeedLines] = createSignal<'all' | 'none'>('all');

  // The store's Sent purchase orders (spec S2 / AC-PG3). Fetched on open;
  // non-suspending read so the modal shows a spinner rather than tripping a
  // boundary.
  const [poData] = createResource(
    () => (props.mode === 'fromPurchaseOrder' ? params.storeId : undefined),
    async storeId => {
      const result = await graphqlFetch(SentPurchaseOrders, {
        storeId,
        filter: { status: { equalTo: 'SENT' } },
      });
      if (result.kind !== 'success') return [];
      return result.data.purchaseOrders.__typename === 'PurchaseOrderConnector'
        ? result.data.purchaseOrders.nodes
        : [];
    }
  );
  const purchaseOrders = () => poData.latest ?? [];

  const createFromPo = async () => {
    const poId = selectedPoId();
    const po = purchaseOrders().find(p => p.id === poId);
    if (!po || !po.supplier || creating()) return;
    setCreating(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(InsertInboundShipmentExternal, {
      storeId: params.storeId,
      input: {
        id: crypto.randomUUID(),
        otherPartyId: po.supplier.id,
        purchaseOrderId: po.id,
        insertLinesFromPurchaseOrder: seedLines() === 'all',
      },
    });
    setCreating(false);
    if (result.kind !== 'success') return;
    const response = result.data.insertInboundShipmentExternal;
    if (response.__typename === 'InvoiceNode') return goToShipment(response.id);
    if (response.__typename === 'InsertInboundShipmentError')
      setErrorMessage(response.error.description);
  };

  const errorLead = (
    <Show when={errorMessage()}>
      <Alert severity="error">{errorMessage()}</Alert>
    </Show>
  );

  return (
    <Show
      when={props.mode === 'fromPurchaseOrder'}
      fallback={
        // Manual: a "Suppliers" modal — selecting a supplier confirms + closes.
        <Dialog
          open
          dismissable={!creating()}
          onClose={props.onClose}
          title={showLinkStep() ? t('internal-order') : t('suppliers')}
          testId="create-inbound-modal"
          actionsLead={errorLead}
          actions={
            <>
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                onClick={props.onClose}
              >
                {t('button.cancel')}
              </Button>
              {/* Link step: an explicit Create button (a supplier is already
                  chosen; the internal-order link is optional). */}
              <Show when={showLinkStep()}>
                <Button
                  data-testid="dialog-button-ok"
                  loading={creating()}
                  onClick={() =>
                    void create(
                      supplier()!.id,
                      linkRequisitionId() || undefined
                    )
                  }
                >
                  {t('button.create-shipment')}
                </Button>
              </Show>
            </>
          }
        >
          <Show when={!creating()} fallback={<Spinner center />}>
            <Show
              when={showLinkStep()}
              fallback={
                <NameSearch
                  label={t('label.supplier-name')}
                  storeId={params.storeId}
                  role="supplier"
                  onSelect={onSupplierSelect}
                />
              }
            >
              <Show when={!ordersData.loading} fallback={<Spinner center />}>
                <Show
                  when={internalOrders().length > 0}
                  fallback={
                    <Alert severity="info">
                      {t('error.no-inbound-shipments-linked')}
                    </Alert>
                  }
                >
                  <Select
                    label={t('internal-order')}
                    value={linkRequisitionId()}
                    onValueChange={setLinkRequisitionId}
                    options={[
                      { value: '', label: t('label.none') },
                      ...internalOrders().map(o => ({
                        value: o.id,
                        label: `#${o.requisitionNumber}`,
                      })),
                    ]}
                  />
                </Show>
              </Show>
            </Show>
          </Show>
        </Dialog>
      }
    >
      <Dialog
        open
        dismissable={!creating()}
        onClose={props.onClose}
        title={t('button.new-external-shipment')}
        testId="create-inbound-external-modal"
        actionsLead={errorLead}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
            <Button
              data-testid="dialog-button-ok"
              loading={creating()}
              disabled={!selectedPoId()}
              onClick={() => void createFromPo()}
            >
              {t('button.ok')}
            </Button>
          </>
        }
      >
        <Show when={!poData.loading} fallback={<Spinner center />}>
          <Show
            when={purchaseOrders().length > 0}
            fallback={
              <Alert severity="info">
                {t('messages.no-sent-purchase-orders')}
              </Alert>
            }
          >
            <Select
              label={t('label.purchase-order')}
              placeholder={t('label.select-purchase-order')}
              value={selectedPoId()}
              onValueChange={setSelectedPoId}
              options={purchaseOrders().map(po => ({
                value: po.id,
                label: `#${po.number} — ${po.supplier?.name ?? ''}`,
                description: po.reference ?? undefined,
              }))}
            />
            <RadioGroup
              label={t('label.lines')}
              value={seedLines()}
              onChange={value => setSeedLines(value as 'all' | 'none')}
              options={[
                { value: 'all', label: t('label.seed-all-lines') },
                { value: 'none', label: t('label.seed-no-lines') },
              ]}
            />
          </Show>
        </Show>
      </Dialog>
    </Show>
  );
};
