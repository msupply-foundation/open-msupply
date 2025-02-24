import React, { FC, ReactElement } from 'react';

import { useDialog, useNotification } from '@common/hooks';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  BaseDatePickerInput,
  BasicTextInput,
  DialogButton,
  InputWithLabelRow,
  NumericTextInput,
} from '@common/components';

import { Box, Stack } from '@openmsupply-client/common';
import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';

import { usePatient } from '../api';
import { InsurancePolicySelect } from './InsurancePolicySelect';
import { InsuranceProvidersSelect } from './InsuranceProvidersSelect';
import { InsuranceStatusToggle } from './InsuranceStatusToggle';
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
    updatePatch,
  } = useInsurances(nameId);

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
      <Stack gap={8} flexDirection="row">
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            label={t('label.policy-number-family')}
            Input={
              <BasicTextInput
                disabled={haveInsuranceId}
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
                disabled={haveInsuranceId}
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
          <InsuranceStatusToggle
            isActive={draft.isActive}
            onChange={isActive =>
              updatePatch({
                isActive,
              })
            }
          />
        </Box>
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            label={t('label.expiry-date')}
            Input={
              <BaseDatePickerInput
                value={DateUtils.getNaiveDate(draft.expiryDate)}
                onChange={date => {
                  if (date)
                    updatePatch({
                      expiryDate: formatDateTime.customDate(date, 'yyyy-MM-dd'),
                    });
                }}
              />
            }
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
            label={t('label.discount-rate')}
            Input={
              <NumericTextInput
                min={0}
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
    </Modal>
  );
};
