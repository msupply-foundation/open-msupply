import {
  createEffect,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { NameSearch } from '../../../domain/name';
import type { NameOption } from '../../../domain/name';
import { t } from '../../../intl';
import { inboundShipmentPreferences } from '../../../store/storeContext';
import {
  InsertInboundShipment,
  InsertInboundShipmentExternal,
  SentPurchaseOrders,
} from './createInboundShipment.generated';
import { SupplierInternalOrders } from '../detail/inboundShipmentLookups.generated';
import { LinkInternalOrderModal } from './LinkInternalOrderModal';
import { LinkPurchaseOrderModal } from './LinkPurchaseOrderModal';

// The inbound-shipment create flow (spec S2). A sequence of modal steps,
// branching on which create action was taken:
//
//  - 'manual': a "Suppliers" lookup. Selecting a supplier both confirms and
//    closes it. Then, only when the store allows manually linking internal
//    orders AND the supplier has ≥1 linkable (Sent) order, the rich
//    LinkInternalOrderModal opens (link one, or Next to skip). A supplier with
//    no linkable orders — or a store without the preference — creates
//    immediately, no extra step.
//  - 'fromPurchaseOrder': the rich LinkPurchaseOrderModal (offered only when the
//    store's procurement preference is on). Linking a PO is mandatory; the
//    supplier comes from the chosen order. Creates via the ...External twin
//    (contract → creation wire trap: purchaseOrderId REQUIRES the external
//    mutation).
//
// The two pickers are contextful tables, NOT single-field dropdowns — see the
// modal components. This orchestrator owns the data resources + the create
// mutations; the pickers are presentational and call back with the chosen id(s).

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

  // The supplier search is this step's only control, so the dialog opens on it
  // (ui-standards › accessibility › keyboard) — declared on the Dialog, which
  // owns the timing. Manual mode only: the from-PO flow opens a table picker,
  // not a search field, and that Dialog declares no initial focus.
  const supplierSearch = createFocusTarget();

  // ── Manual: pick a supplier, optionally link an open internal order, create.
  const [supplier, setSupplier] = createSignal<NameOption | null>(null);
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
  // The link step is offered ONLY when the chosen supplier actually has open
  // internal orders (spec S2) — not for every supplier. A supplier with no open
  // orders skips it and creates immediately (below); while orders load we hold
  // on a spinner rather than flashing the supplier search.
  const awaitingOrders = () =>
    canLinkOrders() && !!supplier() && ordersData.loading;
  const showLinkStep = () =>
    canLinkOrders() &&
    !!supplier() &&
    !ordersData.loading &&
    internalOrders().length > 0;

  // Guards the once-per-supplier auto-create so the effect can't loop if create
  // fails; reset whenever a new supplier is chosen.
  const [linkResolved, setLinkResolved] = createSignal(false);
  // Linking allowed + supplier chosen + orders resolved to NONE → create now,
  // exactly as the no-linking path does (no forced extra step).
  createEffect(() => {
    if (!canLinkOrders() || !supplier() || ordersData.loading) return;
    if (internalOrders().length === 0 && !linkResolved()) {
      setLinkResolved(true);
      void create(supplier()!.id);
    }
  });

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
    setLinkResolved(false);
    setSupplier(chosen);
    // No linking configured → create straight away (spec S2 default manual
    // flow). When linking IS allowed, the effect above decides: link step if
    // the supplier has open orders, immediate create if not.
    if (chosen && !canLinkOrders()) void create(chosen.id);
  };

  // ── From a purchase order ─────────────────────────────────────────────────
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

  const createFromPo = async (purchaseOrderId: string, addLines: boolean) => {
    const po = purchaseOrders().find(p => p.id === purchaseOrderId);
    if (!po || !po.supplier || creating()) return;
    setCreating(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(InsertInboundShipmentExternal, {
      storeId: params.storeId,
      input: {
        id: crypto.randomUUID(),
        otherPartyId: po.supplier.id,
        purchaseOrderId: po.id,
        insertLinesFromPurchaseOrder: addLines,
      },
    });
    setCreating(false);
    if (result.kind !== 'success') return;
    const response = result.data.insertInboundShipmentExternal;
    if (response.__typename === 'InvoiceNode') return goToShipment(response.id);
    if (response.__typename === 'InsertInboundShipmentError')
      setErrorMessage(response.error.description);
  };

  // The three steps render as always-mounted siblings driven by reactive `open`
  // props (the repo's modal pattern — see the detail view). NOT a <Switch>:
  // switching branches would UNMOUNT the active <Dialog>, and a native <dialog>
  // fires its `close` event on unmount, which the Dialog reports as onClose —
  // tearing the whole create flow down (the modal "flashes and closes"). With
  // `open` driven reactively, the closing dialog's onClose is guarded by its
  // now-false `open`, so the transition is silent.
  return (
    <>
      {/* Suppliers step (manual): a supplier lookup; selecting confirms +
          closes. Open until the link step takes over; holds a spinner while a
          chosen supplier's open orders load or a create is in flight. */}
      <Dialog
        open={props.mode === 'manual' && !showLinkStep()}
        dismissable={!creating()}
        closeButton
        onClose={props.onClose}
        title={t('suppliers')}
        initialFocus={supplierSearch}
        testId="create-inbound-modal"
      >
        <Show when={errorMessage()}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
        <Show
          when={!creating() && !awaitingOrders()}
          fallback={<Spinner center />}
        >
          <NameSearch
            label={t('label.supplier-name')}
            storeId={params.storeId}
            role="supplier"
            focusTarget={supplierSearch}
            onSelect={onSupplierSelect}
          />
        </Show>
      </Dialog>

      <LinkInternalOrderModal
        open={showLinkStep()}
        onClose={props.onClose}
        orders={internalOrders()}
        loading={ordersData.loading}
        busy={creating()}
        error={errorMessage()}
        onLink={requisitionId => void create(supplier()!.id, requisitionId)}
        onNext={() => void create(supplier()!.id)}
      />

      <LinkPurchaseOrderModal
        open={props.mode === 'fromPurchaseOrder'}
        onClose={props.onClose}
        orders={purchaseOrders()}
        loading={poData.loading}
        busy={creating()}
        error={errorMessage()}
        onSelect={(id, addLines) => void createFromPo(id, addLines)}
      />
    </>
  );
};
