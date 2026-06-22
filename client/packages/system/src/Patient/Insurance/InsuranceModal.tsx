import React, { ReactElement, useMemo } from 'react';
import {
  ErrorDisplay,
  FieldErrorWrapper,
  useDialog,
  useForm,
  useNotification,
} from '@common/hooks';
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

const FORM_ID = 'patient-insurance';

export const InsuranceModal = ({
  patientName,
}: {
  patientName?: string;
}): ReactElement => {
  const t = useTranslation();
  const formatDateTime = useFormatDateTime();
  const { success, error } = useNotification();
  const { current, setModal } = usePatientModalStore();
  const form = useForm(FORM_ID);

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
    hasInsuranceId,
    draft,
    updatePatch,
  } = useInsurancePolicies(nameId, patientName);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

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
    form.showRequired();
    if (form.hasErrors()) return;
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
          flexDirection: 'column',
          alignItems: 'stretch',
          margin: '0 auto',
        },
      }}
    >
      <>
        <Stack gap={8} flexDirection="row">
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.name-of-the-insured')}
              Input={
                <BasicTextInput
                  formError={{
                    formId: FORM_ID,
                    fieldId: 'nameOfInsured',
                    label: t('label.name-of-the-insured'),
                  }}
                  value={draft.nameOfInsured}
                  onChange={event => {
                    updatePatch({
                      nameOfInsured: event.target.value,
                    });
                  }}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.policy-number-family')}
              Input={
                <BasicTextInput
                  formError={{
                    formId: FORM_ID,
                    fieldId: 'policyNumberFamily',
                    label: t('label.policy-number-family'),
                  }}
                  required={!draft.policyNumberPerson}
                  disabled={hasInsuranceId}
                  value={draft.policyNumberFamily}
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
                  formError={{
                    formId: FORM_ID,
                    fieldId: 'policyNumberPerson',
                    label: t('label.policy-number-person'),
                  }}
                  required={!draft.policyNumberFamily}
                  disabled={hasInsuranceId}
                  value={draft.policyNumberPerson}
                  onChange={event => {
                    updatePatch({
                      policyNumberPerson: event.target.value,
                    });
                  }}
                />
              }
            />
            <FieldErrorWrapper
              formId={FORM_ID}
              fieldId="policyType"
              label={t('label.policy-type')}
              value={draft.policyType}
              required
            >
              {({ error, required }) => (
                <InsurancePolicySelect
                  policyType={draft.policyType}
                  error={error}
                  required={required}
                  onChange={value => updatePatch({ policyType: value })}
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
                <DateTimePickerInput
                  formError={{
                    formId: FORM_ID,
                    fieldId: 'expiryDate',
                    label: t('label.insurance-expiry-date'),
                  }}
                  required
                  value={DateUtils.getNaiveDate(draft.expiryDate)}
                  validate={date =>
                    date && date < today ? t('error.date-in-past') : null
                  }
                  onChange={date => {
                    updatePatch({
                      expiryDate: date
                        ? formatDateTime.customDate(date, 'yyyy-MM-dd')
                        : '',
                    });
                  }}
                />
              }
              sx={{ justifyContent: 'flex-end' }}
            />
            <FieldErrorWrapper
              formId={FORM_ID}
              fieldId="insuranceProviderId"
              label={t('label.provider-name')}
              value={draft.insuranceProviderId}
              required
            >
              {({ error, required }) => (
                <InsuranceProvidersSelect
                  insuranceProviderId={draft.insuranceProviderId}
                  error={error}
                  required={required}
                  onChange={value => {
                    updatePatch({
                      insuranceProviderId: value,
                    });
                  }}
                />
              )}
            </FieldErrorWrapper>
            <InputWithLabelRow
              label={t('label.coverage-rate')}
              Input={
                <NumericTextInput
                  formError={{
                    formId: FORM_ID,
                    fieldId: 'discountPercentage',
                    label: t('label.coverage-rate'),
                  }}
                  customError={
                    draft.isActive && (draft.discountPercentage ?? 0) === 0
                      ? {
                          message: t('messages.active-policy-needs-coverage'),
                          // The default coverage is 0 and the default isActive
                          // is true, so this rule trips on a freshly opened
                          // form. Defer the message until the user attempts
                          // Save so they don't see an error before they've
                          // touched anything.
                          showOnSubmit: true,
                        }
                      : null
                  }
                  required
                  min={0}
                  max={100}
                  decimalLimit={2}
                  value={draft.discountPercentage}
                  endAdornment="%"
                  onChange={value =>
                    updatePatch({ discountPercentage: value })
                  }
                />
              }
            />
          </Box>
        </Stack>
        <ErrorDisplay formId={FORM_ID} sx={{ marginTop: '1em' }} />
      </>
    </Modal>
  );
};
