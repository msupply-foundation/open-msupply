import React, { useEffect, useRef, useState } from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  TableProvider,
  createTableStore,
  useKeyboardHeightAdjustment,
  useTabs,
  ModalMode,
  Box,
  AlertColor,
} from '@openmsupply-client/common';
import { useDraftInboundReturnLines } from './useDraftInboundReturnLines';
import { ItemSelector } from './ItemSelector';
import { ReturnSteps, Tabs } from './ReturnSteps';

interface InboundReturnEditModalProps {
  isOpen: boolean;
  outboundShipmentLineIds: string[];
  customerId: string;
  onClose: () => void;
  modalMode: ModalMode | null;
  returnId?: string;
  initialItemId?: string | null;
}

export const InboundReturnEditModal = ({
  isOpen,
  outboundShipmentLineIds,
  customerId,
  onClose,
  modalMode,
  returnId,
  initialItemId,
}: InboundReturnEditModalProps) => {
  const t = useTranslation('distribution');
  const { currentTab, onChangeTab } = useTabs(Tabs.Quantity);

  const [itemId, setItemId] = useState<string | undefined>(
    initialItemId ?? undefined
  );

  const alertRef = useRef<HTMLDivElement>(null);

  const [zeroQuantityAlert, setZeroQuantityAlert] = useState<
    AlertColor | undefined
  >();

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(700);

  const { lines, update, saveInboundReturn, addDraftLine } =
    useDraftInboundReturnLines({
      outboundShipmentLineIds,
      customerId,
      returnId,
      itemId,
    });

  // TODO: own hook
  useEffect(() => {
    const keyBinding = (e: KeyboardEvent) => {
      if (returnId && e.key === '+') {
        e.preventDefault();
        addDraftLine();
      }
    };

    window.addEventListener('keydown', keyBinding);
    return () => window.removeEventListener('keydown', keyBinding);
  }, []);

  const onOk = async () => {
    try {
      await saveInboundReturn();
      onClose();
    } catch {
      // TODO: handle error display...
    }
  };

  const handleNext = () => {
    if (lines.some(line => line.numberOfPacksReturned !== 0)) {
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
        // zeroQuantityAlert === warning implies all lines are 0 and user has
        // been already warned, so we act immediately to update them
        nextButton={
          currentTab === Tabs.Quantity && zeroQuantityAlert !== 'warning' ? (
            <DialogButton onClick={handleNext} variant={'next'} />
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
              // We only want to allow adding draft lines when we are adding by item
              addDraftLine={itemId ? addDraftLine : undefined}
            />
          )}
        </Box>
      </Modal>
    </TableProvider>
  );
};
