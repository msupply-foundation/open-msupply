import { generateUUID } from '../../../uuid';
import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { CancelButton } from '../../../ui/elements/buttons/StandardButtons';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { NameSearch } from '../../../domain/name';
import { InsertSupplierReturn } from './supplierReturns.generated';

// S2 — supplier selection (spec/supplier-returns/ui-surface.md): a modal over
// the list holding a single supplier lookup. Choosing a supplier IMMEDIATELY
// creates an empty NEW return and navigates to its detail — no second confirm
// step. The two typed rejections (supplier not visible / not a supplier)
// surface inline and the modal stays open with the lookup preserved; anything
// non-typed went through the generic error path already.

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

  const create = async (supplierId: string) => {
    if (creating()) return; // re-entry guard
    setCreating(true);
    setError(undefined);
    const result = await graphqlFetch(InsertSupplierReturn, {
      storeId: params.storeId,
      input: {
        id: generateUUID(),
        supplierId,
        supplierReturnLines: [],
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
    const response = result.data.insertSupplierReturn;
    if (response.__typename === 'InsertSupplierReturnError') {
      setError(response.error.description);
      return;
    }
    navigate(`/${params.storeId}/replenishment/supplier-return/${response.id}`);
  };

  // The supplier lookup is this dialog's only control, so the dialog opens on
  // it (ui-standards › accessibility › keyboard).
  const supplierSearch = createFocusTarget();

  return (
    <Dialog
      open
      initialFocus={supplierSearch}
      onClose={props.onClose}
      dismissable={!creating()}
      testId="supplier-search-modal"
      title={t('label.supplier-name')}
      // The standard, icon-less dialog dismiss (D55).
      actions={
        // Cancel is the only footer action — choosing a supplier from the list is
        // this dialog's confirm, and Enter there belongs to the picker (KB-E1).
        <CancelButton
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        />
      }
    >
      <NameSearch
        storeId={params.storeId}
        role="supplier"
        label={t('label.supplier-name')}
        placeholder={t('placeholder.search-by-name')}
        disabled={creating()}
        inputTestId="supplier-search-input"
        focusTarget={supplierSearch}
        clearable={false}
        onSelect={supplier => {
          if (supplier) void create(supplier.id);
        }}
      />
      <Show when={error()}>
        {message => <Alert severity="error">{message()}</Alert>}
      </Show>
    </Dialog>
  );
};
