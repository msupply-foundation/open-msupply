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

import { InboundAction, reducer } from './reducer';
import { getInboundShipmentDetailViewApi } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { GeneralTab } from './GeneralTab';
import { InboundLineEdit } from './modals/InboundLineEdit';

import { isInboundEditable } from '../../utils';
import { InboundShipmentItem } from '../../types';

const useDraftInbound = () => {
  const { id } = useParams();
  const { api } = useOmSupplyApi();

  const { draft, save, dispatch, state } = useDocument(
    ['invoice', id],
    reducer,
    getInboundShipmentDetailViewApi(api)
  );

  const onChangeSortBy = (column: Column<InboundShipmentItem>) => {
    dispatch(InboundAction.onSortBy(column));
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

export enum ModalMode {
  Create,
  Update,
}

export const DetailView: FC = () => {
  const t = useTranslation('outbound-shipment');

  const { draft, save, onChangeSortBy, sortBy } = useDraftInbound();

  const [modalState, setModalState] = React.useState<{
    item: InboundShipmentItem | null;
    mode: ModalMode;
  }>({ item: null, mode: ModalMode.Create });
  const { hideDialog, showDialog, Modal } = useDialog({
    onClose: () => setModalState({ item: null, mode: ModalMode.Create }),
  });

  const onChangeSelectedItem = (newItem: Item | null) => {
    if (!newItem)
      return setModalState({ item: newItem, mode: ModalMode.Create });

    // Try and find the summary row that matches the new item
    const item = draft.items.find(
      summaryItem => summaryItem.itemId === newItem.id
    );

    // If we found it, set the selected item.
    if (item) {
      setModalState({ item, mode: ModalMode.Update });
    } else {
      // otherwise, set the selected item to a newly created summary row.
      setModalState({
        item: itemToSummaryItem(newItem),
        mode: ModalMode.Create,
      });
    }
  };

  const onRowClick = (item: InboundShipmentItem) => {
    setModalState({ item, mode: ModalMode.Update });
    showDialog();
  };

  const onAddItem = () => {
    setModalState({ item: null, mode: ModalMode.Create });
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
        title={
          modalState.mode === ModalMode.Create
            ? t('heading.add-item')
            : t('heading.edit-item')
        }
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
        nextButton={
          <DialogButton
            variant="next"
            onClick={() => {}}
            disabled={
              modalState.mode === ModalMode.Update && draft.items.length === 3
            }
          />
        }
        okButton={<DialogButton variant="ok" onClick={hideDialog} />}
        height={600}
        width={1024}
      >
        <InboundLineEdit
          draft={draft}
          mode={modalState.mode}
          item={modalState.item}
          onUpsert={() => {}}
          onChangeItem={onChangeSelectedItem}
        />
      </Modal>
    </TableProvider>
  );
};
