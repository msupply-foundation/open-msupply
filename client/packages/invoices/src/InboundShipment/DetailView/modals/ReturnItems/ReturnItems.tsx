import React from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  TableProvider,
  createTableStore,
  useKeyboardHeightAdjustment,
  HorizontalStepper,
} from '@openmsupply-client/common';
import { useInbound } from '../../../api';
import { QuantityToReturnTable } from './ReturnQuantitiesTable';

interface ReturnItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReturnItemsModal = ({
  isOpen,
  onClose,
}: ReturnItemsModalProps) => {
  const t = useTranslation('replenishment');

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(600);

  const { data } = useInbound.lines.newReturnLines();

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
            lines={data ?? []}
            updateLine={line => {
              console.log(line);
            }}
          />
        </>
      </Modal>
    </TableProvider>
  );
};
