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
import { DateUtils, useTranslation } from '@common/intl';
import { PrescriptionRowFragment, usePrescription } from '../../api';
import { useInsurancePolicies } from '@openmsupply-client/system/src';

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

  const [insuranceId, setInsuranceId] = useState<string | null>();
  const [pluginError, setPluginError] = useState<string>();

  const {
    query: { data: prescriptionData },
  } = usePrescription();

  const nameId = prescriptionData?.patientId ?? '';
  const {
    query: { data },
  } = useInsurancePolicies(nameId);

  // Would normally add this filtering to query, but because the list is short
  // and doesn't involve any pagination, this is appropriate in this case.
  const insuranceData = data?.filter(
    insurance =>
      insurance.isActive && !DateUtils.isExpired(insurance.expiryDate)
  );

  const selectedInsurance = insuranceData?.find(({ id }) => id === insuranceId);

  const { plugins } = usePluginProvider();
  const pluginEvents = usePluginEvents({
    isDirty: false,
  });

  const totalAfterTax = prescriptionData?.pricing.totalAfterTax ?? 0;
  const discountPercentage = selectedInsurance?.discountPercentage ?? 0;
  const totalToBePaidByInsurance =
    totalAfterTax * ((selectedInsurance?.discountPercentage ?? 0) / 100);
  const totalToBePaidByPatient = totalAfterTax - totalToBePaidByInsurance;

  const onSave = async () => {
    if (!prescriptionData) return;

    try {
      await pluginEvents.dispatchEvent({
        id: prescriptionData.id,
      });

      handleConfirm(
        selectedInsurance?.id != null
          ? {
              id: prescriptionData.id,
              nameInsuranceJoinId: selectedInsurance?.id,
              insuranceDiscountPercentage: discountPercentage,
              insuranceDiscountAmount: totalToBePaidByInsurance,
            }
          : {}
      );
      onClose();
    } catch (error) {
      setPluginError((error as Error).message);
    }
  };

  useEffect(() => {
    // Reset plugin error when modal is closed
    setPluginError(undefined);
  }, [isOpen]);

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
                  disabled
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
                  disabled
                />
              }
              sx={{ pt: 1 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InputWithLabelRow
              label={t('label.insurance-policy')}
              Input={
                <Autocomplete
                  options={
                    insuranceData?.map(
                      ({ id, policyNumber, insuranceProviders }) => ({
                        label: `${policyNumber} - ${insuranceProviders?.providerName}`,
                        value: id ?? '',
                      })
                    ) ?? []
                  }
                  getOptionLabel={option => option.label}
                  value={{
                    label: selectedInsurance?.policyNumber ?? '',
                    value: selectedInsurance?.id ?? '',
                  }}
                  onChange={(_, option) => {
                    if (option) {
                      setInsuranceId(option.value);
                    } else {
                      setInsuranceId(null);
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
                  disabled
                  value={`${discountPercentage}%`}
                  sx={{
                    ml: 0.5,
                    mr: 1.5,
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
                totalToBePaidByPatient={totalToBePaidByPatient}
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
