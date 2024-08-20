import React, { useEffect, useRef, useState } from 'react';
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
import { ItemSelector } from './ItemSelector';
import { ReturnSteps, Tabs } from './ReturnSteps';
import { useReturns } from '../../api';
import { useDraftSupplierReturnLines } from './useDraftSupplierReturnLines';

interface SupplierReturnEditModalProps {
  isOpen: boolean;
  stockLineIds: string[];
  onClose: () => void;
  supplierId: string;
  returnId?: string;
  inboundShipmentId?: string;
  initialItemId?: string | null;
  loadNextItem?: () => void;
  hasNextItem?: boolean;
  modalMode: ModalMode | null;
  isNewReturn?: boolean;
}

export const SupplierReturnEditModal = ({
  isOpen,
  stockLineIds,
  onClose,
  supplierId,
  returnId,
  initialItemId,
  modalMode,
  inboundShipmentId,
  loadNextItem,
  hasNextItem = false,
  isNewReturn = false,
}: SupplierReturnEditModalProps) => {
  const t = useTranslation('replenishment');
  const { currentTab, onChangeTab } = useTabs(Tabs.Quantity);
  const [itemId, setItemId] = useState<string | undefined>(
    initialItemId ?? undefined
  );
  const alertRef = useRef<HTMLDivElement>(null);

  const [zeroQuantityAlert, setZeroQuantityAlert] = useState<
    AlertColor | undefined
  >();

  // The inboundIsDisabled hook returns true when there is no data, so in the
  // case of a new return, we want to make sure it is *not* disabled
  const isDisabled = useReturns.utils.supplierIsDisabled() && !isNewReturn;

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

  const { lines, update, save } = useDraftSupplierReturnLines({
    supplierId,
    stockLineIds,
    returnId,
    itemId,
    inboundShipmentId,
  });

  useEffect(() => {
    if (initialItemId === undefined) return;
    setItemId(initialItemId === null ? undefined : initialItemId);
  }, [initialItemId]);

  const onOk = async () => {
    try {
      !isDisabled && (await save());
      onClose();
    } catch {
      // TODO: handle error display...
    }
  };

  const handleNextItem = async () => {
    try {
      !isDisabled && (await save());
      loadNextItem && loadNextItem();
      onChangeTab(Tabs.Quantity);
    } catch {
      // TODO: handle error display...
    }
  };

  const handleNextStep = () => {
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

  const CancelButton = <DialogButton onClick={onClose} variant="cancel" />;
  const BackButton = (
    <DialogButton onClick={() => onChangeTab(Tabs.Quantity)} variant="back" />
  );
  const NextStepButton = (
    <DialogButton
      onClick={handleNextStep}
      variant="next"
      disabled={!lines.length}
      customLabel={t('button.next-step')}
    />
  );
  const OkButton = <DialogButton onClick={onOk} variant="ok" />;
  const OkAndNextButton = (
    <DialogButton
      onClick={handleNextItem}
      variant="next"
      disabled={
        currentTab !== Tabs.Reason ||
        (isDisabled && !hasNextItem) ||
        (modalMode === ModalMode.Update && !hasNextItem)
      }
    />
  );

  return (
    <TableProvider createStore={createTableStore}>
      <Modal
        title={t('heading.return-items')}
        cancelButton={currentTab === Tabs.Quantity ? CancelButton : BackButton}
        // zeroQuantityAlert === warning implies all lines are 0 and user has
        // been already warned, so we act immediately to update them
        okButton={
          currentTab === Tabs.Quantity && zeroQuantityAlert !== 'warning'
            ? NextStepButton
            : OkButton
        }
        nextButton={!isNewReturn ? OkAndNextButton : undefined}
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
              returnId={returnId}
              zeroQuantityAlert={zeroQuantityAlert}
              setZeroQuantityAlert={setZeroQuantityAlert}
            />
          )}
        </Box>
      </Modal>
    </TableProvider>
  );
};
