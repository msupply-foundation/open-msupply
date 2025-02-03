import React, { ChangeEvent, FC, ReactElement, useState } from 'react';
import { DialogButton } from '@common/components';
import { Grid, TextField } from '@openmsupply-client/common';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { usePrescription } from '../../api';

// When there's a 0 cost for the prescription, no Payment window shows on finalise
// If there are no insurance providers configured, no Payment window shows on finalise
// Payment window shows correct total price for the prescription
// The user can select an insurance policy (if configured for the current patient)
// Insurance policy should show the discount rate and policy type (Family or Personal)

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentsModal: FC<PaymentsModalProps> = ({
  isOpen,
  onClose,
}): ReactElement => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const {
    query: { data },
  } = usePrescription();

  const [totalAfterTax, setTotalAfterTax] = useState(
    data?.pricing.totalAfterTax
  );

  console.log('lines', data);

  const fields = [
    {
      label: 'Total to be paid',
      type: 'number',
      value: totalAfterTax,
      onChange: (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ): void => setTotalAfterTax(Number(event.target.value)),
    },
    { label: 'Outstanding payment' }, // amount outstanding
    { label: 'Type of payment' },
    { label: 'Amount paid' },
    { label: 'Change' },
    { label: 'Note' },
    { label: 'Insurance Scheme' },
    { label: '% Covered' },
    { label: 'Total to be paid by insurance' },
  ];

  return (
    <Modal
      width={900}
      title={t('title.payment')}
      okButton={<DialogButton variant="save" onClick={onClose} />}
    >
      <Grid container spacing={3}>
        {fields.map(({ type, label, value, onChange }, index) => (
          <Grid key={index} size={4}>
            <TextField
              fullWidth
              type={type}
              label={label}
              value={value}
              onChange={onChange}
              sx={{
                '& .MuiInputBase-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Grid>
        ))}
      </Grid>
    </Modal>
  );
};
