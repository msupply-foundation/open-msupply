import React, { FC, ReactElement } from 'react';

import {
  useDialog,
  useFormErrorsHook,
  useNotification,
  ErrorDisplay,
} from '@common/hooks';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  BaseDatePickerInput,
  BasicTextInput,
  Checkbox,
  DialogButton,
  InputWithLabelRow,
  NumericTextInput,
  Typography,
} from '@common/components';
import { Box, Stack } from '@openmsupply-client/common';
import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { usePatient } from '../api';
import { InsurancePolicySelect } from './InsurancePolicySelect';
import { InsuranceProvidersSelect } from './InsuranceProvidersSelect';
import { useInsurances } from '../apiModern/hooks/useInsurances';

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
  const {
    create: { create },
    update: { update },
    insuranceId,
    haveInsuranceId,
    draft,
    updatePatch: updateDraft,
  } = useInsurances(nameId);

  const { resetRequiredErrors, getErrorProps, hasErrors } = useFormErrorsHook();

  const updatePatch: (newData: Partial<unknown>) => void = newData => {
    resetRequiredErrors();
    updateDraft(newData);
  };

  const handleInsuranceUpdate = async (): Promise<void> => {
    try {
      await update();
      success(t('messages.insurance-saved'))();
      setModal(undefined);
    } catch (e) {
      error(
        t('messages.error-saving-insurances', { error: (e as Error).message })
      )();
    }
  };

  const handleInsuranceInsert = async (): Promise<void> => {
    try {
      const result = await create();
      if (result != null) setModal(undefined);
      success(t('messages.insurance-created'))();
    } catch (e) {
      error(
        t('messages.missing-insurance-inputs', { error: (e as Error).message })
      )();
    }
  };

  const handleSave = async (): Promise<void> => {
    if (hasErrors()) {
      console.log("Errors, can't submit");
      return;
    }
    if (insuranceId !== undefined) await handleInsuranceUpdate();
    else await handleInsuranceInsert();
  };

  console.log('draft.discountPercentage', draft.discountPercentage);

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
      <>
        <Stack gap={8} flexDirection="row">
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.policy-number-family')}
              Input={
                <BasicTextInput
                  {...getErrorProps({
                    code: t('label.policy-number-family'),
                    value: draft.policyNumberFamily,
                    required: true,
                  })}
                  disabled={haveInsuranceId}
                  onChange={event => {
                    updatePatch({
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
                  {...getErrorProps({
                    code: t('label.policy-number-person'),
                    value: draft.policyNumberPerson,
                    required: true,
                    customValidation: () => draft.policyNumberPerson !== '666',
                    customErrorMessage:
                      'That is the devils number and is not allowed',
                  })}
                  disabled={haveInsuranceId}
                  onChange={event => {
                    updatePatch({
                      policyNumberPerson: event.target.value,
                    });
                  }}
                />
              }
            />
            <InsurancePolicySelect
              {...getErrorProps({
                code: t('label.policy-type'),
                value: draft.policyType,
                required: true,
              })}
              policyType={draft.policyType}
              onChange={value =>
                updatePatch({
                  policyType: value,
                })
              }
            />
            <InputWithLabelRow
              label={t('label.status')}
              Input={
                <Box sx={{ gap: 2, display: 'flex', flexDirection: 'row' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Checkbox
                      checked={draft.isActive}
                      onChange={() => updatePatch({ isActive: true })}
                    />
                    <Typography variant="body1">{t('label.active')}</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Checkbox
                      checked={!draft.isActive}
                      onChange={() => updatePatch({ isActive: false })}
                    />
                    <Typography variant="body1">
                      {t('label.inactive')}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </Box>
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.expiry-date')}
              Input={
                <BaseDatePickerInput
                  {...getErrorProps({
                    code: t('label.expiry-date'),
                    value: DateUtils.getNaiveDate(draft.expiryDate),
                    required: true,
                  })}
                  value={DateUtils.getNaiveDate(draft.expiryDate)}
                  onChange={date => {
                    if (date)
                      updatePatch({
                        expiryDate: formatDateTime.customDate(
                          date,
                          'yyyy-MM-dd'
                        ),
                      });
                  }}
                />
              }
            />
            <InsuranceProvidersSelect
              {...getErrorProps({
                code: t('label.provider-name'),
                value: draft.insuranceProviderId,
                required: true,
              })}
              insuranceProviderId={draft.insuranceProviderId}
              onChange={value => {
                updatePatch({
                  insuranceProviderId: value,
                });
              }}
            />
            <InputWithLabelRow
              label={t('label.discount-rate')}
              Input={
                <NumericTextInput
                  {...getErrorProps({
                    code: t('label.discount-rate'),
                    value: draft.discountPercentage,
                    required: true,
                    customErrorMessage:
                      draft.discountPercentage >= 110
                        ? 'Waaaay to big!'
                        : undefined,
                  })}
                  min={0}
                  max={100}
                  decimalLimit={2}
                  value={draft.discountPercentage ?? 0}
                  onChange={value => {
                    if (value) {
                      updatePatch({
                        discountPercentage: value,
                      });
                    }
                  }}
                />
              }
            />
          </Box>
        </Stack>
        <ErrorDisplay />
      </>
    </Modal>
  );
};
