import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { gated } from '../../../../api/gated';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { CatalogueIcon } from '../../../../ui/icons';
import {
  AddToOutboundFromMasterList,
  CustomerMasterLists,
} from '../outboundDetail.generated';

export interface AddFromMasterListActionProps {
  storeId: string;
  shipmentId: string;
  customerNameId: string;
  /** Offered while NEW only (spec § adding from a master list). */
  visible: boolean;
  /** Lines were added — the view refetches. */
  onCommitted: () => void;
}

// "Add from master list" (rules.md § adding from a master list,
// OMS-REG-DIST-03.10): every stock item of a CUSTOMER-visible master list lands
// as a zero-quantity placeholder (already-present items skipped server-side).
// The picker offers only lists joined to the customer, so the
// not-for-this-customer rejection is a race — surfaced as an inline notice in
// the dialog, which stays open (controls › dialogs, D20). Success closes it:
// the refreshed line table is the confirmation.
export const AddFromMasterListAction: Component<
  AddFromMasterListActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  // The master-list picker is this dialog's only control, so the dialog
  // opens on it (ui-standards › accessibility › keyboard).
  const picker = createFocusTarget();

  const [adding, setAdding] = createSignal(false);
  const [error, setError] = createSignal<string>();
  // The chosen list id (the Combobox selection), committed by the dialog's OK.
  // No "add all items?" confirmation (D46) — the picker's OK is the deliberate
  // commit, and it shows a spinner until the bulk add resolves.
  const [selected, setSelected] = createSignal<string>();

  // The customer's master lists — fetched when the modal first opens, keyed on
  // the customer.
  const [lists] = createResource(
    () => (open() ? props.customerNameId : undefined),
    async customerNameId => {
      const result = await graphqlFetch(CustomerMasterLists, {
        storeId: props.storeId,
        customerNameId,
      });
      if (result.kind !== 'success') return [];
      return result.data.masterLists.__typename === 'MasterListConnector'
        ? result.data.masterLists.nodes
        : [];
    }
  );
  const listOptions = () => gated(lists) ?? [];

  const add = async (masterListId: string) => {
    setError(undefined);
    setAdding(true);
    const result = await graphqlFetch(AddToOutboundFromMasterList, {
      storeId: props.storeId,
      shipmentId: props.shipmentId,
      masterListId,
    });
    setAdding(false);
    if (result.kind !== 'success') return;
    const response = result.data.addToOutboundShipmentFromMasterList;
    if (response.__typename !== 'InvoiceLineConnector') {
      setError(response.error.description);
      return;
    }
    setOpen(false);
    props.onCommitted();
  };

  return (
    <Show when={props.visible}>
      <Button
        // A catalogue, not a bare plus: this button collapses to its icon
        // beside "Add item" on a narrow viewport, and two identical plus
        // circles there would be two unlabelled buttons that look the same.
        icon={<CatalogueIcon />}
        collapsible="narrow"
        title={t('button.add-from-master-list')}
        data-testid="add-from-master-list-button"
        onClick={() => {
          setError(undefined);
          setSelected(undefined);
          setOpen(true);
        }}
      >
        {t('button.add-from-master-list')}
      </Button>
      <Dialog
        open={open()}
        initialFocus={picker}
        dismissable={!adding()}
        onClose={() => setOpen(false)}
        title={t('button.add-from-master-list')}
        widthRem={32}
        minBodyHeightRem={20}
        actions={
          <>
            <CancelButton
              data-testid="dialog-button-cancel"
              disabled={adding()}
              onClick={() => setOpen(false)}
            />
            {/* Save commits the bulk add directly (spec S3 Layout, D46) —
                disabled until a list is chosen, and showing a spinner until the
                add resolves. No separate "add all items?" confirmation. */}
            <DialogSaveButton
              data-testid="dialog-button-ok"
              disabled={!selected()}
              loading={adding()}
              onClick={() => {
                const chosen = selected();
                if (chosen) void add(chosen);
              }}
            />
          </>
        }
      >
        <Show
          when={listOptions().length > 0 || lists.loading}
          fallback={<p>{t('error.no-master-lists')}</p>}
        >
          <Combobox
            label={t('label.master-list')}
            focusTarget={picker}
            items={listOptions()}
            loading={lists.loading}
            itemToString={list => list.name}
            itemToValue={list => list.id}
            value={selected() ?? ''}
            disabled={adding()}
            onChange={list => {
              if (list) setSelected(list.id);
            }}
          />
        </Show>
        <Show when={error()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      </Dialog>
    </Show>
  );
};
