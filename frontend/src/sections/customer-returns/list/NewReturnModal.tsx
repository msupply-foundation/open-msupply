import { generateUUID } from '../../../uuid';
import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { CancelButton } from '../../../ui/elements/buttons/StandardButtons';
import { NameSearch } from '../../../domain/name';
import { InsertCustomerReturn } from './customerReturns.generated';

// S2 — customer selection (spec/customer-returns/ui-surface.md): a modal over
// the list holding a single customer lookup. Choosing a customer IMMEDIATELY
// creates an empty NEW return and navigates to its detail — no second confirm
// step (AC-C1). The two typed rejections (customer not visible / not a
// customer) surface inline and the modal stays open with the lookup preserved
// (AC-C2); anything non-typed went through the generic error path already.

export interface NewReturnModalProps {
  open: boolean;
  onClose: () => void;
}

export const NewReturnModal: Component<NewReturnModalProps> = props => (
  // Mount-while-open so each open starts fresh (no stale error/selection).
  <Show when={props.open}>
    <Body onClose={props.onClose} />
  </Show>
);

const Body: Component<{ onClose: () => void }> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  const create = async (customerId: string) => {
    if (creating()) return; // re-entry guard
    setCreating(true);
    setError(undefined);
    const result = await graphqlFetch(InsertCustomerReturn, {
      storeId: params.storeId,
      input: {
        id: generateUUID(),
        customerId,
        customerReturnLines: [],
      },
    });
    setCreating(false);
    if (result.kind === 'forbidden') {
      // Permission lost since the list gated the affordance (a mid-session
      // revoke). The global permission-denied modal already showed; close so
      // this isn't a dead end behind it — no misleading generic notice.
      props.onClose();
      return;
    }
    if (result.kind !== 'success') {
      // Transport / non-typed rejection → the global modal already showed it;
      // give the modal its own inline notice so the flow isn't a dead end.
      setError(t('error.failed-to-create-return'));
      return;
    }
    const response = result.data.insertCustomerReturn;
    if (response.__typename === 'InsertCustomerReturnError') {
      setError(response.error.description);
      return;
    }
    navigate(`/${params.storeId}/distribution/customer-return/${response.id}`);
  };

  // The customer lookup is this dialog's only control, so the dialog opens on
  // it (ui-standards › accessibility › keyboard).
  const customerSearch = createFocusTarget();

  return (
    <Dialog
      open
      initialFocus={customerSearch}
      onClose={props.onClose}
      dismissable={!creating()}
      testId="customer-search-modal"
      title={t('label.customer-name')}
      // The standard, icon-less dialog dismiss (D55).
      actions={
        <CancelButton
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        />
      }
    >
      <NameSearch
        storeId={params.storeId}
        role="customer"
        label={t('label.customer-name')}
        placeholder={t('placeholder.search-by-name')}
        disabled={creating()}
        inputTestId="customer-search-input"
        focusTarget={customerSearch}
        clearable={false}
        onSelect={customer => {
          if (customer) void create(customer.id);
        }}
      />
      <Show when={error()}>
        {message => <Alert severity="error">{message()}</Alert>}
      </Show>
    </Dialog>
  );
};
