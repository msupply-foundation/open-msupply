import React, { FC, ReactElement } from 'react';
import { DialogButton, InputWithLabelRow } from '@common/components';
import {
  Grid,
  CurrencyInput,
  usePluginProvider,
} from '@openmsupply-client/common';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { usePrescription } from '../../api';

interface PaymentModalField {
  label: string;
  value?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

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

  const { plugins } = usePluginProvider();

  const fields: PaymentModalField[] = [
    {
      label: t('label.total-to-be-paid'),
      value: data?.pricing.totalAfterTax,
      disabled: true,
      onChange: () => {},
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
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            onClose();
          }}
        />
      }
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
      <>
        <Grid container spacing={3} justifyContent="center">
          {fields.map(({ label, value, disabled = false, onChange }, index) => (
            <Grid key={index} size={4}>
              <InputWithLabelRow
                label={label}
                Input={
                  <CurrencyInput
                    value={value}
                    disabled={disabled}
                    onChangeNumber={onChange}
                  />
                }
              />
            </Grid>
          ))}
          {plugins.prescriptionPaymentForm?.map(
            (Plugin, index) =>
              data && <Plugin key={index} prescriptionData={data} />
          )}
        </Grid>
      </>
    </Modal>
  );
};
