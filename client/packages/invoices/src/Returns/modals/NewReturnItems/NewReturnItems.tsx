import React from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  TableProvider,
  createTableStore,
  useKeyboardHeightAdjustment,
  WizardStepper,
  Box,
} from '@openmsupply-client/common';
import { QuantityToReturnTable } from './ReturnQuantitiesTable';
import { useDraftNewReturnLines } from './useDraftNewReturnLines';

interface NewReturnItemsModalProps {
  isOpen: boolean;
  stockLineIds: string[];
  onClose: () => void;
}

export const NewReturnItemsModal = ({
  isOpen,
  stockLineIds,
  onClose,
}: NewReturnItemsModalProps) => {
  const t = useTranslation('replenishment');

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

  const { lines, update } = useDraftNewReturnLines(stockLineIds);

  return (
    <TableProvider createStore={createTableStore}>
      <Modal
        title={t('heading.return-items')}
        cancelButton={<DialogButton onClick={onClose} variant="cancel" />}
        nextButton={
          <DialogButton
            onClick={() => {
              /* TODO  - next page */
            }}
            variant="next"
          />
        }
        height={height}
        width={1024}
      >
        <>
          <Box paddingTop={'10px'}>
            <WizardStepper
              activeStep={0}
              steps={[
                { label: t('label.select-quantity'), description: '' },
                { label: t('label.reason'), description: '' },
              ]}
            />
          </Box>
          <QuantityToReturnTable
            lines={lines}
            updateLine={line => {
              update(line);
            }}
          />
        </>
      </Modal>
    </TableProvider>
  );
};
