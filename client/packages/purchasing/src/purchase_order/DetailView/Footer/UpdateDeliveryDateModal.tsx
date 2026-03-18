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

type DateType = 'expected' | 'requested';

const translationKeys: Record<
  DateType,
  {
    title: string;
    confirmMessage: string;
    successMessage: string;
  }
> = {
  expected: {
    title: 'label.update-expected-delivery-date',
    confirmMessage:
      'label.update-purchase-order-expected-delivery-date-for-selected-lines',
    successMessage:
      'messages.updated-purchase-order-expected-delivery-date',
  },
  requested: {
    title: 'label.update-requested-delivery-date',
    confirmMessage:
      'label.update-purchase-order-requested-delivery-date-for-selected-lines',
    successMessage:
      'messages.updated-purchase-order-requested-delivery-date',
  },
};

interface UpdateDeliveryDateModalProps {
  dateType: DateType;
  selectedRows: PurchaseOrderLineFragment[];
  isOpen: boolean;
  onClose: () => void;
  resetRowSelection: () => void;
}

export const UpdateDeliveryDateModal = ({
  dateType,
  selectedRows,
  isOpen,
  onClose,
  resetRowSelection,
}: UpdateDeliveryDateModalProps): ReactElement => {
  const t = useTranslation();
  const { success } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { updateLines } = usePurchaseOrderLine();

  const keys = translationKeys[dateType];
  const fieldName =
    dateType === 'expected' ? 'expectedDeliveryDate' : 'requestedDeliveryDate';

  const updateDeliveryDate = async () => {
    if (!selectedDate) return;

    try {
      const formattedDate = Formatter.naiveDate(selectedDate);
      await updateLines(selectedRows, {
        [fieldName]: { value: formattedDate },
      });
      success(t(keys.successMessage))();
      resetRowSelection();
      onClose();
    } catch (e) {
      console.error(`Error updating ${dateType} delivery date: `, e);
    }
  };

  const handleClick = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t(keys.confirmMessage, { count: selectedRows.length }),
    onConfirm: updateDeliveryDate,
  });

  return (
    <Modal
      width={320}
      title={t(keys.title)}
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
