import React, { FC } from 'react';
import { useParams } from 'react-router';
import {
  Column,
  TableProvider,
  createTableStore,
  useOmSupplyApi,
  useDocument,
  useColumns,
  GenericColumnKey,
  getNotePopoverColumn,
  getRowExpandColumn,
} from '@openmsupply-client/common';
import { reducer } from './reducer';
import { getInboundShipmentDetailViewApi } from './api';

import { Toolbar } from './Toolbar';
import { isInboundEditable } from '../../utils';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { InboundShipmentItem } from '../../types';
import { OutboundAction } from '../../OutboundShipment/DetailView/reducer';
import { GeneralTab } from '../../OutboundShipment/DetailView/tabs/GeneralTab';

const useDraftInbound = () => {
  const { id } = useParams();
  const { api } = useOmSupplyApi();

  const { draft, save, dispatch, state } = useDocument(
    ['invoice', id],
    reducer,
    getInboundShipmentDetailViewApi(api)
  );

  const onChangeSortBy = (column: Column<InboundShipmentItem>) => {
    dispatch(OutboundAction.onSortBy(column));
  };

  return { draft, save, dispatch, onChangeSortBy, sortBy: state.sortBy };
};

export const DetailView: FC = () => {
  const { draft, save, onChangeSortBy, sortBy } = useDraftInbound();

  const onRowClick = () => {};

  const columns = useColumns(
    [
      getNotePopoverColumn<InboundShipmentItem>(),
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      'locationDescription',
      'sellPricePerPack',
      'packSize',
      'itemUnit',
      'unitQuantity',
      'numberOfPacks',
      getRowExpandColumn<InboundShipmentItem>(),
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isInboundEditable(draft)}
        onAddItem={() => {}}
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
  );
};
