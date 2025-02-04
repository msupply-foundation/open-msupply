import React, { FC, ReactElement } from 'react';
import { DialogButton } from '@common/components';
import { Grid, TextField } from '@openmsupply-client/common';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { usePrescription } from '../../api';

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleConfirm: () => void;
}

export const PaymentsModal: FC<PaymentsModalProps> = ({
  isOpen,
  onClose,
  handleConfirm,
}): ReactElement => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const {
    query: { data },
  } = usePrescription();

  const fields = [
    {
      label: 'Total to be paid',
      type: 'number',
      value: data?.pricing.totalAfterTax,
    },
    // Data not available yet!
    // { label: 'Outstanding payment' }
    // { label: 'Type of payment' },
    // { label: 'Amount paid' },
    // { label: 'Change' },
    // { label: 'Note' },
    // { label: 'Insurance Scheme' },
    // { label: '% Covered' },
    // { label: 'Total to be paid by insurance' },
  ];

  return (
    <Modal
      width={900}
      title={t('title.payment')}
      okButton={
        <DialogButton
          variant="save"
          onClick={() => {
            handleConfirm();
            onClose();
          }}
        />
      }
    >
      <Grid container spacing={3}>
        {fields.map(({ type, label, value }, index) => (
          <Grid key={index} size={4}>
            <TextField
              fullWidth
              type={type}
              label={label}
              value={value}
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
