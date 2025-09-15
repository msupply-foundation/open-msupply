import React, { ReactElement, useState } from 'react';
import {
  DialogButton,
  Formatter,
  useConfirmationModal,
  useDialog,
  useNotification,
  useTableStore,
  useTranslation,
} from '@openmsupply-client/common';
import { usePurchaseOrderLine } from '../../api';
import { DateCalendar } from '@mui/x-date-pickers';

interface ExpectedDeliveryDateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpectedDeliveryDateModal = ({
  isOpen,
  onClose,
}: ExpectedDeliveryDateModalProps): ReactElement => {
  const t = useTranslation();
  const { success } = useNotification();
  const { clearSelected } = useTableStore();
  const { Modal } = useDialog({ isOpen, onClose });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { updateLines } = usePurchaseOrderLine();

  const updateExpectedDeliveryDate = async () => {
    if (!selectedDate) return;

    try {
      const formattedDate = Formatter.naiveDate(selectedDate);
      await updateLines({
        expectedDeliveryDate: formattedDate,
      });
      success(t('messages.updated-purchase-order-expected-delivery-date'))();
      clearSelected();
      onClose();
    } catch (e) {
      console.error('Error updating expected delivery date: ', e);
    }
  };

  const handleClick = useConfirmationModal({
    title: t('title.update-purchase-order-expected-delivery-date'),
    message: t(
      'label.update-purchase-order-expected-delivery-date-for-all-lines'
    ),
    onConfirm: updateExpectedDeliveryDate,
  });

  return (
    <Modal
      width={320}
      title={t('label.update-expected-delivery-date')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="save"
          onClick={() => handleClick()}
          disabled={!selectedDate}
        />
      }
      contentProps={{ sx: { p: 0 } }}
    >
      <DateCalendar
        value={selectedDate}
        onChange={value => setSelectedDate(value)}
      />
    </Modal>
  );
};
