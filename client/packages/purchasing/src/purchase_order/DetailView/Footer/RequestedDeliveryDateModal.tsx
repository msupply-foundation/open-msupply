import React, { ReactElement, useState } from 'react';
import {
  DialogButton,
  Formatter,
  useConfirmationModal,
  useDialog,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment, usePurchaseOrderLine } from '../../api';
import { DateCalendar } from '@mui/x-date-pickers';

interface RequestedDeliveryDateModalProps {
  selectedRows: PurchaseOrderLineFragment[];
  isOpen: boolean;
  onClose: () => void;
  resetRowSelection: () => void;
}

export const RequestedDeliveryDateModal = ({
  selectedRows,
  isOpen,
  onClose,
  resetRowSelection,
}: RequestedDeliveryDateModalProps): ReactElement => {
  const t = useTranslation();
  const { success } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { updateLines } = usePurchaseOrderLine();

  const updateRequestedDeliveryDate = async () => {
    if (!selectedDate) return;

    try {
      const formattedDate = Formatter.naiveDate(selectedDate);
      await updateLines(selectedRows, {
        requestedDeliveryDate: formattedDate,
      });
      success(t('messages.updated-purchase-order-requested-delivery-date'))();
      resetRowSelection();
      onClose();
    } catch (e) {
      console.error('Error updating requested delivery date: ', e);
    }
  };

  const handleClick = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t(
      'label.update-purchase-order-requested-delivery-date-for-selected-lines',
      { count: selectedRows.length }
    ),
    onConfirm: updateRequestedDeliveryDate,
  });

  return (
    <Modal
      width={320}
      title={t('label.update-requested-delivery-date')}
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
