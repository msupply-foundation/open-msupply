import { generateUUID } from '../../../uuid';
import { createSignal, Show, type JSX } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { XCircleIcon } from '../../../ui/icons';
import { NameSearch, type NameOption } from '../../../domain/name';
import { InsertOutboundShipment } from './outboundShipments.generated';

// S2 — customer selection (spec/outbound-shipments ui-surface § S2): a modal
// over the list titled "Customers", holding a single customer lookup. Choosing
// a customer creates the shipment immediately and navigates to its detail
// (FL2); on-hold customers are listed but not selectable (AC-C3, enforced by
// the lookup). Failure surfaces as an inline notice in the modal, which stays
// open with the lookup preserved (controls › dialogs, D20).
export const CustomerSearchModal = (props: {
  open: boolean;
  onClose: () => void;
}): JSX.Element => (
  <Show when={props.open}>
    <CustomerSearchContent onClose={props.onClose} />
  </Show>
);

const CustomerSearchContent = (props: { onClose: () => void }): JSX.Element => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const create = async (customer: NameOption | null) => {
    if (!customer || creating()) return;
    setError(undefined);
    setCreating(true);
    const result = await graphqlFetch(
      InsertOutboundShipment,
      {
        storeId: params.storeId,
        // The id is client-generated so the create can navigate (AC-C1).
        input: { id: generateUUID(), otherPartyId: customer.id },
      },
      { returnGraphqlErrors: true }
    );
    setCreating(false);
    if (result.kind === 'graphqlError') {
      setError(result.message);
      return;
    }
    if (result.kind !== 'success') return;
    const response = result.data.insertOutboundShipment;
    if (response.__typename !== 'InvoiceNode') {
      // A typed rejection (party not a customer / not visible — AC-C2): the
      // picker only offers valid customers, so this is a race; show it.
      const description =
        response.__typename === 'InsertOutboundShipmentError'
          ? response.error.description
          : t('customers');
      setError(description);
      return;
    }
    props.onClose();
    navigate(
      `/${params.storeId}/distribution/outbound-shipment/${response.id}`
    );
  };

  // The customer lookup is this dialog's only control, so the dialog opens on
  // it (ui-standards › accessibility › keyboard).
  const customerSearch = createFocusTarget();

  return (
    <Dialog
      open
      initialFocus={customerSearch}
      testId="customer-search-modal"
      title={t('customers')}
      dismissable={!creating()}
      onClose={props.onClose}
      widthRem={36}
      // Room for the lookup's open listbox inside the dialog.
      minBodyHeightRem={24}
      actions={
        <Button
          variant="secondary"
          icon={<XCircleIcon />}
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        >
          {t('button.cancel')}
        </Button>
      }
    >
      <NameSearch
        label={t('label.customer-name')}
        storeId={params.storeId}
        role="customer"
        placeholder={t('placeholder.search-by-name')}
        disabled={creating()}
        inputTestId="customer-search-input"
        focusTarget={customerSearch}
        clearable={false}
        onSelect={customer => void create(customer)}
      />
      <Show when={error()}>
        {message => <Alert severity="error">{message()}</Alert>}
      </Show>
    </Dialog>
  );
};
