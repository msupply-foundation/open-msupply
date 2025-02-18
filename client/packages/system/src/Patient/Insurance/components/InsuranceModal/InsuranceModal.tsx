import React, { FC, ReactElement, useEffect, useState } from 'react';

import { useDialog, useNotification, useUrlQuery } from '@common/hooks';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  BaseDatePickerInput,
  BasicTextInput,
  DialogButton,
  InputWithLabelRow,
  NumericTextInput,
} from '@common/components';

import {
  Box,
  FnUtils,
  InsurancePolicyNodeType,
  Stack,
} from '@openmsupply-client/common';
import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';

import { usePatient } from '../../../api';
import { InsurancePolicySelect } from '../InsurancePolicySelect';
import { InsuranceProvidersSelect } from '../InsuranceProvidersSelect';
import { InsuranceStatusToggle } from '../InsuranceStatusToggle';

const DEFAULT_INSURANCE = {
  id: '',
  policyNumberFamily: '',
  policyNumberPerson: '',
  insuranceProviderId: '',
  policyType: '' as InsurancePolicyNodeType,
  isActive: false,
  discountPercentage: 0,
  expiryDate: '',
};

export const InsuranceModal: FC = (): ReactElement => {
  const t = useTranslation();
  const formatDateTime = useFormatDateTime();
  const { success, error } = useNotification();
  const { current, setModal } = usePatientModalStore();

  const { Modal } = useDialog({
    disableBackdrop: true,
    onClose: () => setModal(undefined),
    isOpen: current === PatientModal.Insurance,
  });

  const nameId = usePatient.utils.id();
  const { data } = usePatient.document.insurances({ nameId });
  const [insurance, setInsurance] = useState(DEFAULT_INSURANCE);

  const { urlQuery } = useUrlQuery();
  const insuranceId = urlQuery['insuranceId'];
  const haveInsuranceId = insuranceId !== undefined;
  const selectedInsurance = data?.nodes.find(({ id }) => id === insuranceId);

  const { mutateAsync: updateInsurance } =
    usePatient.document.updateInsurance();

  const handleInsuranceUpdate = async (): Promise<void> => {
    const { policyNumberFamily, policyNumberPerson, ...insuranceInput } =
      insurance;
    try {
      await updateInsurance(insuranceInput);
      success(t('messages.insurance-saved'))();
    } catch (e) {
      error(
        t('messages.error-saving-insurances', { error: (e as Error).message })
      )();
    }
  };

  const { mutateAsync: insertInsurance } =
    usePatient.document.insertInsurance();

  const handleInsuranceInsert = async (): Promise<void> => {
    try {
      await insertInsurance({
        ...insurance,
        id: FnUtils.generateUUID(),
        nameId,
      });
      success(t('messages.insurance-created'))();
    } catch (e) {
      error(
        t('messages.error-saving-insurances', { error: (e as Error).message })
      )();
    }
  };

  const handleSave = async (): Promise<void> => {
    if (insuranceId !== undefined) await handleInsuranceUpdate();
    else await handleInsuranceInsert();
    setModal(undefined);
  };

  useEffect(() => {
    if (selectedInsurance) {
      const { insuranceProviders, policyNumber, ...insuranceDetails } =
        selectedInsurance;

      setInsurance({
        ...insuranceDetails,
        policyNumberFamily: insuranceDetails.policyNumberFamily ?? '',
        policyNumberPerson: insuranceDetails.policyNumberPerson ?? '',
      });
    } else {
      setInsurance(DEFAULT_INSURANCE);
    }
  }, [selectedInsurance]);

  return (
    <Modal
      width={800}
      title={
        insuranceId === undefined
          ? t('title.new-insurance')
          : t('title.edit-insurance')
      }
      cancelButton={
        <DialogButton variant="cancel" onClick={() => setModal(undefined)} />
      }
      okButton={<DialogButton variant="save" onClick={handleSave} />}
      sx={{
        '& .MuiDialogContent-root': { display: 'flex', alignItems: 'center' },
      }}
    >
      <Stack gap={8} flexDirection="row">
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            label={t('label.policy-number-family')}
            Input={
              <BasicTextInput
                disabled={haveInsuranceId}
                value={insurance.policyNumberFamily}
                onChange={event => {
                  setInsurance({
                    ...insurance,
                    policyNumberFamily: event.target.value,
                  });
                }}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.policy-number-person')}
            Input={
              <BasicTextInput
                disabled={haveInsuranceId}
                value={insurance.policyNumberPerson}
                onChange={event => {
                  setInsurance({
                    ...insurance,
                    policyNumberPerson: event.target.value,
                  });
                }}
              />
            }
          />
          <InsurancePolicySelect
            policyType={insurance.policyType}
            onChange={value =>
              setInsurance({
                ...insurance,
                policyType: value as InsurancePolicyNodeType,
              })
            }
          />
          <InsuranceStatusToggle
            isActive={insurance.isActive}
            onChange={isActive => setInsurance({ ...insurance, isActive })}
          />
        </Box>
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            label={t('label.expiry-date')}
            Input={
              <BaseDatePickerInput
                value={DateUtils.getNaiveDate(insurance.expiryDate)}
                onChange={date => {
                  if (date)
                    setInsurance({
                      ...insurance,
                      expiryDate: formatDateTime.customDate(date, 'yyyy-MM-dd'),
                    });
                }}
              />
            }
          />
          <InsuranceProvidersSelect
            insuranceProviderId={insurance.insuranceProviderId}
            onChange={value => {
              setInsurance({ ...insurance, insuranceProviderId: value });
            }}
          />
          <InputWithLabelRow
            label={t('label.discount-rate')}
            Input={
              <NumericTextInput
                min={0}
                decimalLimit={2}
                value={insurance.discountPercentage ?? 0}
                onChange={value => {
                  if (value) {
                    setInsurance({
                      ...insurance,
                      discountPercentage: value,
                    });
                  }
                }}
              />
            }
          />
        </Box>
      </Stack>
    </Modal>
  );
};
