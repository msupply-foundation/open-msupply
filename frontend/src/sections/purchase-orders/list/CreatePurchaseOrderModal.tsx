import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { generateUUID } from '@/uuid';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { NameSearch, type NameOption } from '@/domain/name';
import { InsertPurchaseOrder } from './createPurchaseOrder.generated';

// The purchase-order create flow (spec/purchase-orders S2). Creation takes ONE
// input — the supplier — so this is a single step with no confirming action:
// choosing a supplier both commits and dismisses, and a successful create
// opens the new order, so the list is never where a new order is first seen
// (OMS-FUN-PO-01.1/.2, rules § creating an order from the list). Everything
// else about the order (its number, New status, the supplier's currency and
// exchange rate) is the service's own doing.
//
// Only EXTERNAL suppliers visible to the store are offered: an order goes to a
// supplier outside the system, never to another store in it.
//
// Creation has NO typed rejection — `InsertPurchaseOrderResponse` has a single
// member and no error at all, so supplier-unknown, not-a-supplier and
// already-exists are one undifferentiated `Bad user input` (contract ⚠️). The
// failure therefore lands here as one message with the server's raw text
// appended, which is the only thing distinguishing one cause from another.
// Unlike the reference app (which shows a toast on the list) it is stated in
// the surface that fired the action, with the supplier still chosen for a
// retry — ui-standards/controls.md § action feedback, which forbids the toast.

export interface CreatePurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreatePurchaseOrderModal: Component<
  CreatePurchaseOrderModalProps
> = props => (
  <Show when={props.open}>
    <Body onClose={props.onClose} />
  </Show>
);

const Body: Component<{ onClose: () => void }> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  // The supplier search is this dialog's only control, so it opens on it
  // (ui-standards › accessibility › keyboard) — declared on the Dialog, which
  // owns the timing.
  const supplierSearch = createFocusTarget();

  const create = async (supplier: NameOption | null) => {
    if (!supplier || creating()) return;
    setCreating(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(
      InsertPurchaseOrder,
      {
        storeId: params.storeId,
        input: { id: generateUUID(), supplierId: supplier.id },
      },
      // Every rejection is an untyped top-level GraphQL error, so they are
      // taken here rather than reaching the global unexpected-error modal —
      // this dialog is where the user fired the action.
      { returnGraphqlErrors: true }
    );
    setCreating(false);
    if (result.kind === 'graphqlError') {
      setErrorMessage(
        `${t('error.failed-to-create-purchase-order')} ${result.message}`
      );
      return;
    }
    // A transport failure has already reached the global modal; nothing to add.
    if (result.kind !== 'success') return;
    props.onClose();
    navigate(
      `/${params.storeId}/replenishment/purchase-order/${result.data.insertPurchaseOrder.id}`
    );
  };

  return (
    <Dialog
      open
      dismissable={!creating()}
      closeButton
      onClose={props.onClose}
      title={t('suppliers')}
      initialFocus={supplierSearch}
      testId="create-purchase-order-modal"
      widthRem={36}
      // Room for the lookup's open listbox inside the dialog (#1029): header +
      // field + the listbox's 18rem cap + padding. Sized as the inbound
      // shipment create modal, this picker's twin.
      minBodyHeightRem={27}
      // Picking a supplier is what confirms this dialog, so the footer holds
      // only the way out (ui-standards › dialogs § chrome).
      actions={
        <CancelButton
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        />
      }
    >
      <Show when={errorMessage()}>
        {message => <Alert severity="error">{message()}</Alert>}
      </Show>
      <Show when={!creating()} fallback={<Spinner center />}>
        <NameSearch
          label={t('label.supplier-name')}
          storeId={params.storeId}
          role="supplier"
          external
          focusTarget={supplierSearch}
          onSelect={supplier => void create(supplier)}
        />
      </Show>
    </Dialog>
  );
};
