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
}

export const OutboundReturnEditModal = ({
  isOpen,
  stockLineIds,
  onClose,
  supplierId,
  returnId,
  initialItemId,
}: OutboundReturnEditModalProps) => {
  const t = useTranslation('replenishment');
  const { currentTab, onChangeTab } = useTabs(Tabs.Quantity);
  const [itemId, setItemId] = useState<string | undefined>(
    initialItemId ?? undefined
  );
  const alertRef = useRef<HTMLDivElement>(null);

  const [showZeroQuantityAlert, setShowZeroQuantityAlert] = useState(false);

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
    if (lines.every(line => line.numberOfPacksToReturn === 0)) {
      setShowZeroQuantityAlert(true);
      alertRef?.current?.scrollIntoView({ behavior: 'smooth' });
    } else onChangeTab(Tabs.Reason);
  };

  return (
    <TableProvider createStore={createTableStore}>
      <Modal
        title={t('heading.return-items')}
        cancelButton={<DialogButton onClick={onClose} variant="cancel" />}
        nextButton={
          currentTab === Tabs.Quantity ? (
            <DialogButton
              onClick={handleNext}
              variant="next"
              disabled={!lines.length}
            />
          ) : undefined
        }
        okButton={
          currentTab === Tabs.Reason ? (
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
              showZeroQuantityAlert={showZeroQuantityAlert}
              setShowZeroQuantityAlert={setShowZeroQuantityAlert}
            />
          )}
        </Box>
      </Modal>
    </TableProvider>
  );
};
