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
  Item,
} from '@openmsupply-client/common';

import { reducer } from './reducer';
import { getInboundShipmentDetailViewApi } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { GeneralTab } from './GeneralTab';
import { InboundLineEdit } from './modals/InboundLineEdit';

import { isInboundEditable } from '../../utils';
import { InboundShipmentItem } from '../../types';
import { OutboundAction } from '../../OutboundShipment/DetailView/reducer';

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

export const itemToSummaryItem = (item: Item): InboundShipmentItem => {
  return {
    id: item.id,
    itemId: item.id,
    itemName: item.name,
    itemCode: item.code,
    itemUnit: item.unitName,
    batches: {},
    unitQuantity: 0,
    numberOfPacks: 0,
  };
};

export const DetailView: FC = () => {
  const t = useTranslation('outbound-shipment');
  const { hideDialog, showDialog, Modal } = useDialog();
  const { draft, save, onChangeSortBy, sortBy } = useDraftInbound();

  const [selectedItem, setSelectedItem] = React.useState<{
    item: InboundShipmentItem | null;
    editing: boolean;
  }>({ item: null, editing: false });

  console.log('-------------------------------------------');
  console.log('selectedItem', selectedItem);
  console.log('-------------------------------------------');

  const onChangeSelectedItem = (newItem: Item | null) => {
    if (!newItem) return setSelectedItem({ item: newItem, editing: false });

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

  const onRowClick = (item: InboundShipmentItem) => {
    setSelectedItem({ item, editing: true });
    showDialog();
  };

  const onAddItem = () => {
    setSelectedItem({ item: null, editing: false });
    showDialog();
  };

  const isEditMode = selectedItem.editing;

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
        title={!isEditMode ? t('heading.add-item') : t('heading.edit-item')}
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
        nextButton={<DialogButton variant="next" onClick={() => {}} />}
        okButton={<DialogButton variant="ok" onClick={hideDialog} />}
        height={600}
        width={900}
      >
        <InboundLineEdit
          item={selectedItem.item}
          onUpsert={() => {}}
          onChangeItem={onChangeSelectedItem}
        />
      </Modal>
    </TableProvider>
  );
};
