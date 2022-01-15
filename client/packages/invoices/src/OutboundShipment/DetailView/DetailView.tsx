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
import { toItem } from '@openmsupply-client/system';
import { reducer, OutboundAction } from './reducer';
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

  const itemModalControl = useToggle();

  const { entity, mode, onOpen, onClose, isOpen } = useEditModal<Item>();

  const onRowClick = (item: InvoiceLine | InvoiceItem) => {
    onOpen(toItem(item));
  };

  return draft ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={itemModalControl.toggleOn} />

      {isOpen && (
        <ItemDetailsModal
          item={entity}
          mode={mode}
          draft={draft}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}

      <Toolbar />

      <ContentArea onRowClick={onRowClick} />

      <Footer />
      <SidePanel />
    </TableProvider>
  ) : null;
};
