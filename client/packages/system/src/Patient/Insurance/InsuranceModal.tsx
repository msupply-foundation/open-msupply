import React, { ReactElement } from 'react';
import { useDialog, useNotification } from '@common/hooks';
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

export const InsuranceModal = ({
  patientName,
}: {
  patientName?: string;
}): ReactElement => {
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
    hasInsuranceId,
    draft,
    updatePatch,
  } = useInsurancePolicies(nameId, patientName);

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
      // Temp hotfix for when both policy number fields are empty. Will be
      // improved with new Error State handler
      if (draft.policyNumberFamily === '' && draft.policyNumberPerson === '')
        throw new Error('missing policy numbers');
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
          margin: '0 auto',
        },
      }}
    >
      <Stack gap={8} flexDirection="row">
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            label={t('label.name-of-the-insured')}
            Input={
              <BasicTextInput
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
                required={draft.policyNumberPerson === ''}
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
                required={draft.policyNumberFamily === ''}
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
          <InsurancePolicySelect
            policyType={draft.policyType}
            onChange={value =>
              updatePatch({
                policyType: value,
              })
            }
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
            label={t('label.insurance-expiry-date')}
            Input={
              <DateTimePickerInput
                required
                value={DateUtils.getNaiveDate(draft.expiryDate)}
                onChange={date => {
                  if (date)
                    updatePatch({
                      expiryDate: formatDateTime.customDate(date, 'yyyy-MM-dd'),
                    });
                }}
              />
            }
            sx={{ justifyContent: 'flex-end' }}
          />
          <InsuranceProvidersSelect
            insuranceProviderId={draft.insuranceProviderId}
            onChange={value => {
              updatePatch({
                insuranceProviderId: value,
              });
            }}
          />
          <InputWithLabelRow
            label={t('label.coverage-rate')}
            Input={
              <NumericTextInput
                required
                min={0}
                decimalLimit={2}
                value={draft.discountPercentage ?? 0}
                endAdornment="%"
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
    </Modal>
  );
};
