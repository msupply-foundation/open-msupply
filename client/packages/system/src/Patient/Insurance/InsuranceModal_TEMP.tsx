import {
  useDialog,
  useNotification,
  ErrorDisplay,
  useFormErrorActions,
  FormErrorProvider,
} from '@common/hooks';
import React, { ReactElement } from 'react';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  BasicTextInputWithError,
  DateTimePickerInputWithError,
  DialogButton,
  InputWithLabelRow,
  NumericTextInputWithError,
  Switch,
} from '@common/components';
import { Box, Stack } from '@openmsupply-client/common';
import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { usePatient } from '../api';
import { InsurancePolicySelectWithError } from './InsurancePolicySelect';
import { InsuranceProvidersSelect } from './InsuranceProvidersSelect';
import { useInsurancePolicies } from '../apiModern/hooks/useInsurancesPolicies';

export const InsuranceModalComponent = (): ReactElement => {
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
  } = useInsurancePolicies(nameId);

  const { showRequiredErrors, resetRequiredErrors, hasErrors } =
    useFormErrorActions();

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
    showRequiredErrors();
    if (hasErrors()) {
      // console.log("Errors, can't submit");
      return;
    }
    if (insuranceId !== undefined) await handleInsuranceUpdate();
    else await handleInsuranceInsert();
  };

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
        '& .MuiDialogContent-root': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <>
        <Stack gap={8} flexDirection="row">
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.policy-number-family')}
              Input={
                <BasicTextInputWithError
                  value={draft.policyNumberFamily ?? undefined}
                  required={!draft.policyNumberPerson}
                  disabled={haveInsuranceId}
                  onChange={event => {
                    updatePatch({
                      policyNumberFamily: event.target.value,
                    });
                  }}
                  // These props required for ErrorWrapper, and is the only
                  // difference in implementation from the original
                  // BasicTextInput
                  code="policyNumberFamily"
                  label={t('label.policy-number-family')}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.policy-number-person')}
              Input={
                <BasicTextInputWithError
                  code="policyNumberPerson"
                  label={t('label.policy-number-person')}
                  value={draft.policyNumberPerson ?? undefined}
                  required={!draft.policyNumberFamily}
                  disabled={haveInsuranceId}
                  onChange={event => {
                    updatePatch({
                      policyNumberPerson: event.target.value,
                    });
                  }}
                />
              }
            />
            <InsurancePolicySelectWithError
              value={draft.policyType}
              onChange={value =>
                updatePatch({
                  policyType: value,
                })
              }
              required
              code="insurancePolicy"
              label={t('label.insurance-policy')}
            />
            <InputWithLabelRow
              label={t('label.insurance-active')}
              Input={
                <Switch
                  onChange={() => updatePatch({ isActive: !draft.isActive })}
                  checked={draft.isActive}
                  switchSx={{ left: '-13px' }}
                  color="secondary"
                />
              }
            />
          </Box>
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.expiry-date')}
              Input={
                <DateTimePickerInputWithError
                  value={DateUtils.getNaiveDate(draft.expiryDate)}
                  required
                  onChange={date => {
                    if (date)
                      updatePatch({
                        expiryDate: formatDateTime.customDate(
                          date,
                          'yyyy-MM-dd'
                        ),
                      });
                  }}
                  code="expDate"
                  label={t('label.expiry-date')}
                />
              }
            />
            <InsuranceProvidersSelect
              value={draft.insuranceProviderId}
              onChange={value => {
                updatePatch({
                  insuranceProviderId: value,
                });
              }}
              required
              code="providerName"
              label={t('label.provider-name')}
            />
            <InputWithLabelRow
              label={t('label.discount-rate')}
              Input={
                <NumericTextInputWithError
                  value={draft.discountPercentage}
                  required
                  min={0}
                  max={100}
                  decimalLimit={2}
                  onChange={value => {
                    if (value) {
                      updatePatch({
                        discountPercentage: value,
                      });
                    }
                  }}
                  code="discountPercentage"
                  label={t('label.discount-rate')}
                />
              }
            />
          </Box>
        </Stack>
        <ErrorDisplay sx={{ marginTop: '1em' }} />
      </>
    </Modal>
  );
};

export const InsuranceModal = () => (
  <FormErrorProvider>
    <InsuranceModalComponent />
  </FormErrorProvider>
);
