import React, { FC, ReactElement, useEffect, useState } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  DialogButton,
  InputWithLabelRow,
} from '@common/components';
import { CurrencyInput, Stack } from '@openmsupply-client/common';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { usePrescription } from '../../api';
import { usePatient } from '@openmsupply-client/system/src';

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
  const [insuranceId, setInsuranceId] = useState<string>();
  const [discountRate, setDiscountRate] = useState(0);
  const [totalToBePaid, setTotalToBePaid] = useState(0);

  const {
    query: { data: prescriptionData },
  } = usePrescription();

  const nameId = prescriptionData?.patientId ?? '';
  const { data: insuranceData } = usePatient.document.insurances({
    nameId,
  });

  const selectedInsurance = insuranceData?.nodes.find(
    ({ insuranceProviders }) => insuranceProviders?.id === insuranceId
  );

  const insuranceOptions =
    insuranceData?.nodes.map(({ insuranceProviders }) => ({
      label: insuranceProviders?.providerName ?? '',
      value: insuranceProviders?.id ?? '',
    })) ?? [];

  useEffect(() => {
    if (!prescriptionData) return;

    const totalAfterTax = prescriptionData?.pricing.totalAfterTax ?? 0;
    const discountPercentage = selectedInsurance?.discountPercentage ?? 0;

    setDiscountRate(discountPercentage);

    const discountAmount = (totalAfterTax * discountPercentage) / 100;
    const newTotalToBePaid = totalAfterTax - discountAmount;
    setTotalToBePaid(newTotalToBePaid);
  }, [selectedInsurance]);

  return (
    <Modal
      width={350}
      title={t('title.payment')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
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
      <Stack gap={2}>
        <InputWithLabelRow
          label={t('label.total-to-be-paid')}
          Input={
            <CurrencyInput
              value={prescriptionData?.pricing.totalAfterTax}
              disabled
              onChangeNumber={() => {}}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.provider-name')}
          Input={
            <Autocomplete
              options={insuranceOptions}
              getOptionLabel={option => option.label}
              value={{
                label:
                  selectedInsurance?.insuranceProviders?.providerName ?? '',
                value: selectedInsurance?.insuranceProviders?.id ?? '',
              }}
              onChange={(_, option) => {
                if (option) {
                  setInsuranceId(option.value);
                }
              }}
            />
          }
          sx={{ '& .MuiAutocomplete-root': { flexGrow: 1, borderRadius: 1 } }}
        />
        <InputWithLabelRow
          label={t('label.discount-rate')}
          Input={<BasicTextInput disabled value={discountRate} />}
        />
        <InputWithLabelRow
          label={t('label.total-to-be-paid')}
          Input={
            <CurrencyInput
              key={totalToBePaid}
              disabled
              value={totalToBePaid}
              onChangeNumber={() => {}}
            />
          }
        />
      </Stack>
    </Modal>
  );
};
