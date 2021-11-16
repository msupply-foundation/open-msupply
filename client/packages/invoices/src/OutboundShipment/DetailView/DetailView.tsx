import React, { FC } from 'react';
import { useParams } from 'react-router';
import {
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
} from '@openmsupply-client/common';
import {
  reducer,
  OutboundAction,
  itemToSummaryItem,
  recalculateSummary,
} from './reducer';
import { getOutboundShipmentDetailViewApi } from '../../api';
import { GeneralTab } from './tabs/GeneralTab';
import { ItemDetailsModal } from './modals/ItemDetailsModal';

import { OutboundShipmentSummaryItem } from './types';
import { Toolbar } from './Toolbar';
import { isInvoiceEditable } from '../utils';
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

  return { draft, save, dispatch, onChangeSortBy, sortBy: state.sortBy };
};

export const DetailView: FC = () => {
  const { draft, onChangeSortBy, save, sortBy } = useDraftOutbound();

  const [selectedItem, setSelectedItem] =
    React.useState<OutboundShipmentSummaryItem | null>(null);
  const itemModalControl = useToggle();

  const onRowClick = (item: OutboundShipmentSummaryItem) => {
    setSelectedItem(item);
    itemModalControl.toggle();
  };

  const columns = useColumns(
    [
      getNotePopoverColumn<OutboundShipmentSummaryItem>(),
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      'locationDescription',
      'sellPricePerPack',
      'packSize',
      'itemUnit',
      [
        'unitQuantity',
        {
          accessor: rowData => {
            const { unitQuantity } = recalculateSummary(rowData);
            return unitQuantity;
          },
        },
      ],
      'numberOfPacks',
      getRowExpandColumn<OutboundShipmentSummaryItem>(),
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const onChangeSelectedItem = (newItem: Item | null) => {
    if (!newItem) return setSelectedItem(newItem);

    // Try and find the outbound summary row that matches the new item
    const item = draft.items.find(
      summaryItem => summaryItem.itemId === newItem.id
    );

    // If we found it, set the selected item.
    if (item) {
      setSelectedItem(item);
    } else {
      // otherwise, set the selected item to a newly created summary row.
      setSelectedItem(itemToSummaryItem(newItem));
    }
  };

  return draft ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isInvoiceEditable(draft)}
        onAddItem={itemModalControl.toggleOn}
      />

      <ItemDetailsModal
        summaryItem={selectedItem}
        isOpen={itemModalControl.isOn}
        onClose={itemModalControl.toggleOff}
        onChangeItem={onChangeSelectedItem}
        upsertInvoiceLine={line => draft.upsertLine?.(line)}
      />

      <Toolbar draft={draft} />

      <GeneralTab
        columns={columns}
        data={draft.items}
        onRowClick={onRowClick}
      />

      <Footer draft={draft} save={save} />
      <SidePanel draft={draft} />
    </TableProvider>
  ) : null;
};
