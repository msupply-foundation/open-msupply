import React, { FC, ReactElement, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  BasicTextInput,
  DialogButton,
  InputWithLabelRow,
} from '@common/components';

import {
  Box,
  CurrencyInput,
  Grid,
  usePluginEvents,
  usePluginProvider,
} from '@openmsupply-client/common';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { PrescriptionRowFragment, usePrescription } from '../../api';
import { useInsurances } from '@openmsupply-client/system/src';

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleConfirm: (patch: Partial<PrescriptionRowFragment>) => void;
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
  const [totalToBePaidByInsurance, setTotalToBePaidByInsurance] = useState(0);
  const [pluginError, setPluginError] = useState<string>();

  const {
    query: { data: prescriptionData },
  } = usePrescription();

  const nameId = prescriptionData?.patientId ?? '';
  const {
    query: { data: insuranceData },
  } = useInsurances(nameId);

  const selectedInsurance = insuranceData?.find(
    ({ insuranceProviders }) => insuranceProviders?.id === insuranceId
  );

  const { plugins } = usePluginProvider();
  const pluginEvents = usePluginEvents({
    isDirty: false,
  });

  const onSave = async () => {
    if (!prescriptionData) return;

    try {
      await pluginEvents.dispatchEvent({
        id: prescriptionData.id,
      });
      handleConfirm({
        id: prescriptionData.id,
        nameInsuranceJoinId: selectedInsurance?.id ?? '',
        insuranceDiscountPercentage: discountRate,
        insuranceDiscountAmount: totalToBePaidByInsurance,
      });
      onClose();
    } catch (error) {
      setPluginError((error as Error).message);
    }
  };

  useEffect(() => {
    // Reset plugin error when modal is closed
    setPluginError(undefined);
  }, [isOpen]);

  useEffect(() => {
    if (!prescriptionData) return;
    const totalAfterTax = prescriptionData?.pricing.totalAfterTax ?? 0;
    const discountPercentage = selectedInsurance?.discountPercentage ?? 0;

    setDiscountRate(discountPercentage);
    const discountAmount = (totalAfterTax * discountPercentage) / 100;
    setTotalToBePaidByInsurance(discountAmount);
  }, [selectedInsurance]);

  return (
    <Modal
      width={700}
      title={t('title.payment')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="save" onClick={onSave} />}
      sx={{
        '& .MuiDialogContent-root': { display: 'flex', alignItems: 'center' },
      }}
    >
      <>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InputWithLabelRow
              label={t('label.total-to-be-paid')}
              Input={
                <CurrencyInput
                  value={prescriptionData?.pricing.totalAfterTax}
                  onChangeNumber={() => {}}
                  style={{ borderRadius: 4, pointerEvents: 'none' }}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.paid-by-insurance')}
              Input={
                <CurrencyInput
                  key={totalToBePaidByInsurance}
                  value={totalToBePaidByInsurance}
                  onChangeNumber={() => {}}
                  style={{ borderRadius: 4, pointerEvents: 'none' }}
                />
              }
              sx={{ pt: 1 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InputWithLabelRow
              label={t('label.insurance-scheme')}
              Input={
                <Autocomplete
                  options={
                    insuranceData?.map(
                      ({ insuranceProviders, policyNumber }) => ({
                        label: policyNumber ?? '',
                        value: insuranceProviders?.id ?? '',
                      })
                    ) ?? []
                  }
                  getOptionLabel={option => option.label}
                  value={{
                    label: selectedInsurance?.policyNumber ?? '',
                    value: selectedInsurance?.insuranceProviders?.id ?? '',
                  }}
                  onChange={(_, option) => {
                    if (option) {
                      setInsuranceId(option.value);
                    }
                  }}
                  sx={{ mr: 2 }}
                />
              }
              sx={{
                '& .MuiAutocomplete-root': { flexGrow: 1, borderRadius: 1 },
              }}
            />
            <InputWithLabelRow
              label={t('label.discount-rate')}
              Input={
                <BasicTextInput
                  value={`${discountRate}%`}
                  sx={{
                    ml: 0.5,
                    mr: 1.5,
                    pointerEvents: 'none',
                  }}
                />
              }
              sx={{ pt: 1 }}
            />
          </Grid>
          {plugins?.prescriptionPaymentForm?.map((Plugin, index) =>
            prescriptionData ? (
              <Plugin
                key={index}
                prescriptionData={prescriptionData}
                totalToBePaidByInsurance={totalToBePaidByInsurance}
                totalToBePaidByPatient={
                  prescriptionData.pricing.totalAfterTax -
                  totalToBePaidByInsurance
                }
                events={pluginEvents}
              />
            ) : null
          )}
        </Grid>
        {pluginError && (
          <Box sx={{ pt: 4, display: 'flex', justifyContent: 'center' }}>
            <Alert severity="error">{pluginError}</Alert>
          </Box>
        )}
      </>
    </Modal>
  );
};
