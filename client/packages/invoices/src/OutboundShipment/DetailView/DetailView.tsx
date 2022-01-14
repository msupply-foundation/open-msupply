import React, { FC } from 'react';
import {
  useParams,
  Column,
  TableProvider,
  createTableStore,
  useDocument,
  useToggle,
  useOmSupplyApi,
  Item,
  useEditModal,
} from '@openmsupply-client/common';
import { useItemsList, toItem } from '@openmsupply-client/system';
import { reducer, OutboundAction, itemToSummaryItem } from './reducer';
import { getOutboundShipmentDetailViewApi } from './api';
import { ContentArea } from './ContentArea';
import { ItemDetailsModal } from './modals/ItemDetailsModal';
import {
  OutboundShipmentSummaryItem,
  InvoiceItem,
  InvoiceLine,
} from '../../types';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';

const useDraftOutbound = () => {
  const { id } = useParams();
  const { api } = useOmSupplyApi();

  const { draft, save, dispatch, state } = useDocument(
    ['invoice', id],
    reducer,
    getOutboundShipmentDetailViewApi(api)
  );

  const onChangeSortBy = (column: Column<OutboundShipmentSummaryItem>) => {
    dispatch(OutboundAction.onSortBy(column));
  };

  const onFlattenRows = () => {
    dispatch(OutboundAction.flattenRows());
  };

  const onGroupRows = () => {
    dispatch(OutboundAction.groupRows());
  };

  return {
    draft,
    save,
    dispatch,
    onChangeSortBy,
    sortBy: state.sortBy,
    onFlattenRows,
    onGroupRows,
  };
};

export const DetailView: FC = () => {
  const { draft } = useDraftOutbound();

  const { prefetchListByName } = useItemsList({
    initialSortBy: { key: 'name' },
  });

  const [selectedItem, setSelectedItem] = React.useState<{
    item: OutboundShipmentSummaryItem | null;
    editing: boolean;
  }>({ item: null, editing: false });

  const itemModalControl = useToggle();

  const findNextItem = (currentItem: OutboundShipmentSummaryItem | null) => {
    if (!currentItem) return null;
    const currentItemIdx = draft.items.findIndex(
      item => item.id === currentItem?.id
    );

    return draft.items[(currentItemIdx + 1) % draft.items.length];
  };

  const onNext = () => {
    if (selectedItem.editing) {
      const nextItem = findNextItem(selectedItem?.item);

      if (nextItem) {
        setSelectedItem({ item: nextItem, editing: true });

        const toPrefetch = findNextItem(nextItem);
        if (toPrefetch) prefetchListByName(toPrefetch.itemName);
      }
    } else {
      setSelectedItem({ item: null, editing: false });
    }

    return true;
  };

  const onChangeSelectedItem = (newItem: Item | null) => {
    if (!newItem) return setSelectedItem({ item: null, editing: false });

    // Try and find the outbound summary row that matches the new item
    const item = draft.items.find(
      summaryItem => summaryItem.itemId === newItem.id
    );

    // If we found it, set the selected item.
    if (item) {
      setSelectedItem({ item, editing: true });
    } else {
      // otherwise, set the selected item to a newly created summary row.
      setSelectedItem({ item: itemToSummaryItem(newItem), editing: false });
    }
  };

  const { entity, onOpen, onClose, isOpen } = useEditModal<Item>();

  const onRowClick = (item: InvoiceLine | InvoiceItem) => {
    onOpen(toItem(item));
  };

  return draft ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={itemModalControl.toggleOn} />

      <ItemDetailsModal
        item={entity}
        draft={draft}
        isEditMode={selectedItem.editing}
        onNext={onNext}
        summaryItem={selectedItem?.item}
        isOpen={isOpen}
        onClose={onClose}
        onChangeItem={onChangeSelectedItem}
        upsertInvoiceLine={line => draft.upsertLine?.(line)}
        isOnlyItem={draft.items.length === 1}
      />

      <Toolbar />

      <ContentArea onRowClick={onRowClick} />

      <Footer />
      <SidePanel />
    </TableProvider>
  ) : null;
};
