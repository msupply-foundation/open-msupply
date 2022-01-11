import React, { FC, useState } from 'react';
import {
  TableProvider,
  createTableStore,
  useTranslation,
  useDialog,
  DialogButton,
  Item,
  ModalMode,
} from '@openmsupply-client/common';

import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StocktakeLine, StocktakeSummaryItem } from '../../types';
import { StocktakeLineEdit } from './modal/StocktakeLineEdit';
import { ContentArea } from './ContentArea';

export const toItem = (line: StocktakeLine | StocktakeSummaryItem): Item => ({
  id: 'lines' in line ? line.lines[0].itemId : line.itemId,
  name: 'lines' in line ? line.lines[0].itemName : line.itemName,
  code: 'lines' in line ? line.lines[0].itemCode : line.itemCode,
  isVisible: true,
  availableBatches: [],
  availableQuantity: 0,
  unitName: 'bottle',
});

export const DetailView: FC = () => {
  const [modalState, setModalState] = useState<{
    item: Item | null;
    mode: ModalMode;
  }>({ item: null, mode: ModalMode.Create });
  const { hideDialog, showDialog, Modal } = useDialog({
    onClose: () => setModalState({ item: null, mode: ModalMode.Create }),
  });

  const onRowClick = (item: StocktakeLine | StocktakeSummaryItem) => {
    setModalState({ item: toItem(item), mode: ModalMode.Update });
    showDialog();
  };

  const onAddItem = () => {
    setModalState({ item: null, mode: ModalMode.Create });
    showDialog();
  };

  const onOK = () => {
    hideDialog();
  };

  const t = useTranslation('common');

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={onAddItem} />
      <Toolbar />

      <ContentArea onRowClick={onRowClick} />
      <Footer />
      <SidePanel />

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
            disabled={modalState.mode === ModalMode.Update}
          />
        }
        okButton={<DialogButton variant="ok" onClick={onOK} />}
        height={600}
        width={1024}
      >
        <StocktakeLineEdit mode={modalState.mode} item={modalState.item} />
      </Modal>
    </TableProvider>
  );
};
