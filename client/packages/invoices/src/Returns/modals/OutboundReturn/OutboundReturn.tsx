import React, { useRef, useState } from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  TableProvider,
  createTableStore,
  useKeyboardHeightAdjustment,
  useTabs,
  Box,
  ModalMode,
  AlertColor,
} from '@openmsupply-client/common';
import { useDraftOutboundReturnLines } from './useDraftOutboundReturnLines';
import { ItemSelector } from './ItemSelector';
import { ReturnSteps, Tabs } from './ReturnSteps';

interface OutboundReturnEditModalProps {
  isOpen: boolean;
  stockLineIds: string[];
  onClose: () => void;
  supplierId: string;
  returnId?: string;
  initialItemId?: string | null;
  modalMode: ModalMode | null;
}

export const OutboundReturnEditModal = ({
  isOpen,
  stockLineIds,
  onClose,
  supplierId,
  returnId,
  initialItemId,
  modalMode,
}: OutboundReturnEditModalProps) => {
  const t = useTranslation('replenishment');
  const { currentTab, onChangeTab } = useTabs(Tabs.Quantity);
  const [itemId, setItemId] = useState<string | undefined>(
    initialItemId ?? undefined
  );
  const alertRef = useRef<HTMLDivElement>(null);

  const [zeroQuantityAlert, setZeroQuantityAlert] = useState<
    AlertColor | undefined
  >();

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

  const { lines, update, save } = useDraftOutboundReturnLines({
    supplierId,
    stockLineIds,
    returnId,
    itemId,
  });

  const onOk = async () => {
    try {
      await save();
      onClose();
    } catch {
      // TODO: handle error display...
    }
  };

  const handleNext = () => {
    if (lines.some(line => line.numberOfPacksToReturn !== 0)) {
      onChangeTab(Tabs.Reason);
      return;
    }

    switch (modalMode) {
      case ModalMode.Create: {
        setZeroQuantityAlert('error');
        break;
      }
      case ModalMode.Update: {
        setZeroQuantityAlert('warning');
        break;
      }
    }
    alertRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <TableProvider createStore={createTableStore}>
      <Modal
        title={t('heading.return-items')}
        cancelButton={<DialogButton onClick={onClose} variant="cancel" />}
        nextButton={
          currentTab === Tabs.Quantity && zeroQuantityAlert !== 'warning' ? (
            <DialogButton
              onClick={handleNext}
              variant="next"
              disabled={!lines.length}
            />
          ) : undefined
        }
        okButton={
          currentTab === Tabs.Reason || zeroQuantityAlert === 'warning' ? (
            <DialogButton onClick={onOk} variant="ok" />
          ) : undefined
        }
        height={height}
        width={1024}
      >
        <Box ref={alertRef}>
          {returnId && (
            <ItemSelector
              disabled={!!itemId}
              itemId={itemId}
              onChangeItemId={setItemId}
            />
          )}
          {lines.length > 0 && (
            <ReturnSteps
              currentTab={currentTab}
              lines={lines}
              update={update}
              zeroQuantityAlert={zeroQuantityAlert}
              setZeroQuantityAlert={setZeroQuantityAlert}
            />
          )}
        </Box>
      </Modal>
    </TableProvider>
  );
};
