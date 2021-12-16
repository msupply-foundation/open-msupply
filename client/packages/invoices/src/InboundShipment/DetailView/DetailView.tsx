import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  Item,
} from '@openmsupply-client/common';
import { useDraftInbound } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { GeneralTab } from './GeneralTab';
import { InboundLineEdit } from './modals/InboundLineEdit/InboundLineEdit';
import { getNextInboundStatus, isInboundEditable } from '../../utils';
import { InboundShipmentItem } from '../../types';

export enum ModalMode {
  Create,
  Update,
}

export const toItem = (summaryItem: InboundShipmentItem): Item => ({
  name: summaryItem.itemName,
  code: summaryItem.itemCode,
  id: summaryItem.id,
  isVisible: true,
  availableBatches: [],
  availableQuantity: 0,
  unitName: 'bottle',
});

export const DetailView: FC = () => {
  const { draft, updateInvoice } = useDraftInbound();

  const [modalState, setModalState] = React.useState<{
    item: Item | null;
    mode: ModalMode;
    open: boolean;
  }>({ mode: ModalMode.Create, item: null, open: false });

  const onRowClick = (item: InboundShipmentItem) => {
    setModalState({ mode: ModalMode.Update, item: toItem(item), open: true });
  };

  const onClose = () => {
    setModalState({ mode: ModalMode.Create, item: null, open: false });
  };

  const onAddItem = () => {
    setModalState({ mode: ModalMode.Create, item: null, open: true });
  };

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isInboundEditable(draft)}
        onAddItem={onAddItem}
      />

      <Toolbar draft={draft} update={updateInvoice} />

      <GeneralTab onRowClick={onRowClick} />

      <Footer
        draft={draft}
        save={async () => {
          updateInvoice({ status: getNextInboundStatus(draft?.status) });
        }}
      />
      <SidePanel draft={draft} />

      <InboundLineEdit
        isOpen={modalState.open}
        onClose={onClose}
        mode={modalState.mode}
        item={modalState.item}
      />
    </TableProvider>
  );
};
