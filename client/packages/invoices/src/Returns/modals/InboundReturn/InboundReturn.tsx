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
import { QuantityReturnedTable } from './ReturnQuantitiesTable';
import { useDraftInboundReturnLines } from './useDraftInboundReturnLines';

interface InboundReturnEditModalProps {
  isOpen: boolean;
  stockLineIds: string[];
  onClose: () => void;
}

export const InboundReturnEditModal = ({
  isOpen,
  stockLineIds,
  onClose,
}: InboundReturnEditModalProps) => {
  const t = useTranslation('distribution');

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

  const { lines, update } = useDraftInboundReturnLines(stockLineIds);

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
                { label: t('label.quantity'), description: '' },
                { label: t('label.reason'), description: '' },
              ]}
            />
          </Box>
          <QuantityReturnedTable
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
