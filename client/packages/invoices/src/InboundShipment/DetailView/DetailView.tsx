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
  useDialog,
  DialogButton,
  useTranslation,
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
import { InboundLineEdit } from './modals/InboundLineEdit';

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
  const t = useTranslation('common');
  const { hideDialog, showDialog, Modal } = useDialog();
  const { draft, save, onChangeSortBy, sortBy } = useDraftInbound();

  const [selectedItem, setSelectedItem] = React.useState<{
    item: InboundShipmentItem | null;
    editing: boolean;
  }>({ item: null, editing: false });
  console.log('-------------------------------------------');
  console.log('selectedItem', selectedItem);
  console.log('-------------------------------------------');

  const onRowClick = (item: InboundShipmentItem) => {
    setSelectedItem({ item, editing: true });
    showDialog();
  };

  const onAddItem = () => {
    setSelectedItem({ item: null, editing: false });
    showDialog();
  };

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
        onAddItem={onAddItem}
      />

      <Toolbar draft={draft} />

      <GeneralTab
        columns={columns}
        data={draft.items}
        onRowClick={onRowClick}
      />

      <Footer draft={draft} save={save} />
      <SidePanel draft={draft} />

      <Modal
        title={t('heading.add-item')}
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
        nextButton={<DialogButton variant="next" onClick={() => {}} />}
        okButton={<DialogButton variant="ok" onClick={hideDialog} />}
        height={600}
        width={900}
      >
        <InboundLineEdit />
      </Modal>
    </TableProvider>
  );
};
