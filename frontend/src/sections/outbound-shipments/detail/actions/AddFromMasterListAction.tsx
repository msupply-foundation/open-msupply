import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import { ListIcon, XCircleIcon } from '../../../../ui/icons';
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

// "Add from master list" (rules.md § adding from a master list, AC-P5): every
// stock item of a CUSTOMER-visible master list lands as a zero-quantity
// placeholder (already-present items skipped server-side). The picker offers
// only lists joined to the customer, so the not-for-this-customer rejection is
// a race — surfaced as an inline notice in the dialog, which stays open
// (controls › dialogs, D20). Success closes it: the refreshed line table is
// the confirmation.
export const AddFromMasterListAction: Component<
  AddFromMasterListActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  const [adding, setAdding] = createSignal(false);
  const [error, setError] = createSignal<string>();

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
  const listOptions = () =>
    lists.state === 'ready' || lists.state === 'refreshing'
      ? (lists.latest ?? [])
      : [];

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
        variant="secondary"
        icon={<ListIcon />}
        data-testid="add-from-master-list-button"
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        {t('outbound.detail.add-from-master-list')}
      </Button>
      <Dialog
        open={open()}
        dismissable={!adding()}
        onClose={() => setOpen(false)}
        title={t('outbound.master-list.title')}
        widthRem={32}
        minBodyHeightRem={20}
        actions={
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            data-testid="dialog-button-cancel"
            onClick={() => setOpen(false)}
          >
            {t('common.cancel')}
          </Button>
        }
      >
        <Show
          when={listOptions().length > 0 || lists.loading}
          fallback={<p>{t('outbound.master-list.empty')}</p>}
        >
          <Combobox
            label={t('outbound.master-list.select')}
            items={listOptions()}
            loading={lists.loading}
            itemToString={list => list.name}
            itemToValue={list => list.id}
            openOnFocus
            disabled={adding()}
            onChange={list => {
              if (list) void add(list.id);
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
