import {
  useDialog,
  useNotification,
  ErrorDisplay,
  FieldErrorWrapper,
  useFormErrorContext,
} from '@common/hooks';
import React, { ReactElement } from 'react';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  BasicTextInput,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  NumericTextInput,
  Switch,
} from '@common/components';
import { Box, Stack } from '@openmsupply-client/common';
import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { usePatient } from '../api';
import { InsurancePolicySelect } from './InsurancePolicySelect';
import { InsuranceProvidersSelect } from './InsuranceProvidersSelect';
import { useInsurancePolicies } from '../apiModern/hooks/useInsurancesPolicies';

export const InsuranceModal = (): ReactElement => {
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
    useFormErrorContext();

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
                <FieldErrorWrapper
                  code="policyNumberFamily"
                  label={t('label.policy-number-family')}
                  value={draft.policyNumberFamily ?? undefined}
                  required={!draft.policyNumberPerson}
                >
                  {({ value, required, errorMessage }) => (
                    <BasicTextInput
                      disabled={haveInsuranceId}
                      onChange={event => {
                        updatePatch({
                          policyNumberFamily: event.target.value,
                        });
                      }}
                      value={value}
                      required={required}
                      error={errorMessage != null}
                    />
                  )}
                </FieldErrorWrapper>
              }
            />
            <InputWithLabelRow
              label={t('label.policy-number-person')}
              Input={
                <FieldErrorWrapper
                  code="policyNumberPerson"
                  label={t('label.policy-number-person')}
                  value={draft.policyNumberPerson ?? undefined}
                  required={!draft.policyNumberFamily}
                  customIsValid={draft.policyNumberPerson === '666'}
                  customErrorMessage="That is the devils number and is not allowed"
                >
                  {({ value, required, errorMessage }) => (
                    <BasicTextInput
                      disabled={haveInsuranceId}
                      onChange={event => {
                        updatePatch({
                          policyNumberPerson: event.target.value,
                        });
                      }}
                      value={value}
                      required={required}
                      error={errorMessage != null}
                    />
                  )}
                </FieldErrorWrapper>
              }
            />
            <FieldErrorWrapper
              code="insurancePolicy"
              label={t('label.insurance-policy')}
              required
              value={draft.policyType}
            >
              {({ value, required, errorMessage, setError }) => (
                <InsurancePolicySelect
                  policyType={value}
                  onChange={value =>
                    updatePatch({
                      policyType: value,
                    })
                  }
                  required={required}
                  error={errorMessage != null}
                  setError={setError}
                />
              )}
            </FieldErrorWrapper>
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
              label={t('label.insurance-expiry-date')}
              Input={
                <FieldErrorWrapper
                  code="expDate"
                  label={t('label.expiry-date')}
                  required
                  value={DateUtils.getNaiveDate(draft.expiryDate)}
                >
                  {({ value, required, errorMessage, setError }) => (
                    <DateTimePickerInput
                      value={value}
                      required={required}
                      onChange={date => {
                        if (date)
                          updatePatch({
                            expiryDate: formatDateTime.customDate(
                              date,
                              'yyyy-MM-dd'
                            ),
                          });
                      }}
                      error={errorMessage !== null}
                      setError={setError}
                    />
                  )}
                </FieldErrorWrapper>
              }
            />
            <FieldErrorWrapper
              code="providerName"
              label={t('label.provider-name')}
              value={draft.insuranceProviderId}
              required
            >
              {({ value, required, errorMessage, setError }) => (
                <InsuranceProvidersSelect
                  insuranceProviderId={value}
                  onChange={value => {
                    updatePatch({
                      insuranceProviderId: value,
                    });
                  }}
                  required={required}
                  error={errorMessage != null}
                  setError={setError}
                />
              )}
            </FieldErrorWrapper>
            <InputWithLabelRow
              label={t('label.discount-rate')}
              Input={
                <FieldErrorWrapper
                  code="discountPercentage"
                  label={t('label.discount-rate')}
                  value={draft.discountPercentage}
                  required
                  customIsValid={draft.discountPercentage >= 110}
                  customErrorMessage="Waaaay too big!"
                >
                  {({ value, required, errorMessage, setError }) => (
                    <NumericTextInput
                      value={value}
                      required={required}
                      error={errorMessage != null}
                      setError={setError}
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
                    />
                  )}
                </FieldErrorWrapper>
              }
            />
          </Box>
        </Stack>
        <ErrorDisplay />
      </>
    </Modal>
  );
};
