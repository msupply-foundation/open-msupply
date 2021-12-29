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
import { isInboundEditable } from '../../utils';
import { InvoiceLine, InboundShipmentItem } from '../../types';

export enum ModalMode {
  Create,
  Update,
}

export const toItem = (line: InboundShipmentItem | InvoiceLine): Item => ({
  id: 'lines' in line ? line.lines[0].itemId : line.itemId,
  name: 'lines' in line ? line.lines[0].itemName : line.itemName,
  code: 'lines' in line ? line.lines[0].itemCode : line.itemCode,
  isVisible: true,
  availableBatches: [],
  availableQuantity: 0,
  unitName: 'bottle',
});

export const DetailView: FC = () => {
  const { draft } = useDraftInbound();

  const [modalState, setModalState] = React.useState<{
    item: Item | null;
    mode: ModalMode;
    open: boolean;
  }>({ mode: ModalMode.Create, item: null, open: false });

  const onRowClick = React.useCallback(
    (line: InboundShipmentItem | InvoiceLine) => {
      const item = toItem(line);
      setModalState({ mode: ModalMode.Update, item, open: true });
    },
    [setModalState]
  );

  const onClose = () => {
    setModalState({ mode: ModalMode.Create, item: null, open: false });
  };

  const onAddItem = () => {
    setModalState({ mode: ModalMode.Create, item: null, open: true });
  };

  if (!draft) return null;

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isInboundEditable(draft)}
        onAddItem={onAddItem}
      />

      <Toolbar draft={draft} />

      <GeneralTab onRowClick={onRowClick} />

      <Footer />
      <SidePanel />

      {modalState.open && (
        <InboundLineEdit
          isOpen={modalState.open}
          onClose={onClose}
          mode={modalState.mode}
          item={modalState.item}
        />
      )}
    </TableProvider>
  );
};
