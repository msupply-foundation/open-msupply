import React from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  TableProvider,
  createTableStore,
  useKeyboardHeightAdjustment,
  HorizontalStepper,
  SupplierReturnLine,
} from '@openmsupply-client/common';
import { QuantityToReturnTable } from './ReturnQuantitiesTable';

interface NewReturnItemsModalProps {
  isOpen: boolean;
  newReturns: SupplierReturnLine[];
  onClose: () => void;
}

export const NewReturnItemsModal = ({
  isOpen,
  newReturns,
  onClose,
}: NewReturnItemsModalProps) => {
  const t = useTranslation('replenishment');

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

  // TODO: draft with newREturns!

  return (
    <TableProvider createStore={createTableStore}>
      <Modal
        title={t('heading.return-items')}
        cancelButton={<DialogButton onClick={onClose} variant="cancel" />}
        nextButton={
          <DialogButton
            onClick={() => {
              /* TODO */
            }}
            variant="next"
          />
        }
        height={height}
        width={1024}
      >
        <>
          <HorizontalStepper
            steps={[
              { label: t('label.select-quantity') },
              { label: t('label.reason') },
            ]}
          />
          {/* TODO: updateLine */}
          <QuantityToReturnTable
            lines={newReturns}
            updateLine={line => {
              console.log(line);
            }}
          />
        </>
      </Modal>
    </TableProvider>
  );
};
