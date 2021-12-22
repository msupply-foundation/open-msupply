import React, { FC } from 'react';
import {
  useParams,
  Column,
  TableProvider,
  createTableStore,
  useColumns,
  useDocument,
  useToggle,
  GenericColumnKey,
  getNotePopoverColumn,
  getRowExpandColumn,
  useOmSupplyApi,
  Item,
  ColumnAlign,
  ColumnFormat,
} from '@openmsupply-client/common';
import { reducer, OutboundAction, itemToSummaryItem } from './reducer';
import { getOutboundShipmentDetailViewApi } from './api';
import { GeneralTab } from './tabs/GeneralTab';
import { ItemDetailsModal } from './modals/ItemDetailsModal';

import { OutboundShipmentSummaryItem } from '../../types';
import { Toolbar } from './Toolbar';
import { isInvoiceEditable } from '../../utils';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { useItemsList } from '@openmsupply-client/system';

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
  const { draft, onChangeSortBy, save, sortBy, onFlattenRows, onGroupRows } =
    useDraftOutbound();

  const { prefetchListByName } = useItemsList({
    initialSortBy: { key: 'name' },
  });

  const [selectedItem, setSelectedItem] = React.useState<{
    item: OutboundShipmentSummaryItem | null;
    editing: boolean;
  }>({ item: null, editing: false });

  const itemModalControl = useToggle();

  const onRowClick = (item: OutboundShipmentSummaryItem) => {
    setSelectedItem({ item, editing: true });
    itemModalControl.toggle();
  };

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

  const columns = useColumns(
    [
      {
        ...getNotePopoverColumn<OutboundShipmentSummaryItem>(),
        accessor: () => '',
      },
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      'locationName',
      'itemUnit',
      'numberOfPacks',
      'packSize',
      'unitQuantity',
      {
        label: 'label.unit-price',
        key: 'sellPricePerUnit',
        width: 100,
        align: ColumnAlign.Right,
        format: ColumnFormat.Currency,
        accessor: ({ rowData }) =>
          Object.values(rowData.batches).reduce(
            (sum, batch) =>
              sum + (batch.sellPricePerPack ?? 0) / batch.packSize,
            0
          ),
        getSortValue: row =>
          Object.values(row.batches).reduce(
            (sum, batch) => sum + batch.sellPricePerPack / batch.packSize,
            0
          ),
      },
      {
        label: 'label.line-total',
        key: 'lineTotal',
        width: 100,
        align: ColumnAlign.Right,
        format: ColumnFormat.Currency,
        accessor: ({ rowData }) =>
          Object.values(rowData.batches).reduce(
            (sum, batch) => sum + batch.sellPricePerPack * batch.numberOfPacks,
            0
          ),
        getSortValue: row =>
          Object.values(row.batches).reduce(
            (sum, batch) => sum + batch.sellPricePerPack * batch.numberOfPacks,
            0
          ),
      },
      getRowExpandColumn<OutboundShipmentSummaryItem>(),
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

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

  return draft ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isInvoiceEditable(draft)}
        onAddItem={itemModalControl.toggleOn}
      />

      <ItemDetailsModal
        draft={draft}
        isEditMode={selectedItem.editing}
        onNext={onNext}
        summaryItem={selectedItem?.item}
        isOpen={itemModalControl.isOn}
        onClose={itemModalControl.toggleOff}
        onChangeItem={onChangeSelectedItem}
        upsertInvoiceLine={line => draft.upsertLine?.(line)}
        isOnlyItem={draft.items.length === 1}
      />

      <Toolbar draft={draft} />

      <GeneralTab
        columns={columns}
        data={draft.items}
        onRowClick={onRowClick}
        onFlattenRows={onFlattenRows}
        onGroupRows={onGroupRows}
      />

      <Footer draft={draft} save={save} />
      <SidePanel draft={draft} />
    </TableProvider>
  ) : null;
};
