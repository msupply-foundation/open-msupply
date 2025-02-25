import React, { FC, ReactElement } from 'react';

import {
  // ErrorWrapper,
  useDialog,
  useFormErrors,
  useNotification,
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

  const { ErrorWrapper, checkRequired, ErrorDisplay, resetRequired } =
    useFormErrors(draft);

  const updatePatch: (newData: Partial<unknown>) => void = newData => {
    resetRequired();
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
    if (checkRequired()) {
      console.log('Missing required');
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
        '& .MuiDialogContent-root': { display: 'flex', alignItems: 'center' },
      }}
    >
      <>
        <Stack gap={8} flexDirection="row">
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.policy-number-family')}
              Input={
                <ErrorWrapper code="policyNumberFamily" required>
                  <BasicTextInput
                    disabled={haveInsuranceId}
                    value={draft.policyNumberFamily}
                    onChange={event => {
                      updatePatch({
                        policyNumberFamily: event.target.value,
                      });
                    }}
                  />
                </ErrorWrapper>
              }
            />
            <InputWithLabelRow
              label={t('label.policy-number-person')}
              Input={
                <ErrorWrapper code="policyNumberPerson" required>
                  <BasicTextInput
                    disabled={haveInsuranceId}
                    value={draft.policyNumberPerson}
                    onChange={event => {
                      updatePatch({
                        policyNumberPerson: event.target.value,
                      });
                    }}
                  />
                </ErrorWrapper>
              }
            />
            <ErrorWrapper code="policyType" required>
              <InsurancePolicySelect
                policyType={draft.policyType}
                onChange={value =>
                  updatePatch({
                    policyType: value,
                  })
                }
              />
            </ErrorWrapper>
            <InputWithLabelRow
              label={t('label.status')}
              Input={
                <ErrorWrapper code="isActive">
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
                      <Typography variant="body1">
                        {t('label.active')}
                      </Typography>
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
                </ErrorWrapper>
              }
            />
          </Box>
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.expiry-date')}
              Input={
                <ErrorWrapper code="expiryDate">
                  <BaseDatePickerInput
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
                </ErrorWrapper>
              }
            />
            <ErrorWrapper code="insuranceProviderId">
              <InsuranceProvidersSelect
                insuranceProviderId={draft.insuranceProviderId}
                onChange={value => {
                  updatePatch({
                    insuranceProviderId: value,
                  });
                }}
              />
            </ErrorWrapper>
            <InputWithLabelRow
              label={t('label.discount-rate')}
              Input={
                <ErrorWrapper code="discountPercentage">
                  <NumericTextInput
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
                </ErrorWrapper>
              }
            />
          </Box>
        </Stack>
        <ErrorDisplay />
      </>
    </Modal>
  );
};
