import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  useDialog,
  DialogButton,
  useTranslation,
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

export const DetailView: FC = () => {
  const t = useTranslation('distribution');

  const { draft, updateInvoice, upsertItem, isAddingItem } = useDraftInbound();

  const [modalState, setModalState] = React.useState<{
    item: InboundShipmentItem | null;
    mode: ModalMode;
  }>({ item: null, mode: ModalMode.Create });
  const { hideDialog, showDialog, Modal } = useDialog({
    onClose: () => setModalState({ item: null, mode: ModalMode.Create }),
  });

  const onChangeItem = (item: InboundShipmentItem | null) => {
    setModalState(state => ({ ...state, item }));
  };

  const onRowClick = (item: InboundShipmentItem) => {
    setModalState({ item, mode: ModalMode.Update });
    showDialog();
  };

  const onAddItem = () => {
    setModalState({ item: null, mode: ModalMode.Create });
    showDialog();
  };

  const onOK = async () => {
    await (modalState.item && upsertItem(modalState.item));

    hideDialog();
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
            onClick={async () => {
              try {
                await (modalState.item && upsertItem(modalState.item));
                return setModalState({ mode: ModalMode.Create, item: null });
              } catch (e) {
                return false;
              }
            }}
            disabled={
              modalState.mode === ModalMode.Update && draft.items.length === 3
            }
          />
        }
        okButton={<DialogButton variant="ok" onClick={onOK} />}
        height={600}
        width={1024}
      >
        <InboundLineEdit
          loading={isAddingItem}
          draft={draft}
          mode={modalState.mode}
          item={modalState.item}
          onChangeItem={onChangeItem}
        />
      </Modal>
    </TableProvider>
  );
};
