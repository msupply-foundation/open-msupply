import React, {
  ChangeEvent,
  FC,
  ReactElement,
  useEffect,
  useState,
} from 'react';

import { useDialog, useUrlQuery } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  BasicTextInput,
  Checkbox,
  DialogButton,
  InputWithLabelRow,
  Typography,
} from '@common/components';

import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { Box, Stack } from '@openmsupply-client/common';
import { usePatient } from '../api';

const DEFAULT_INSURANCE = {
  policyNumber: '',
  providerName: '',
  policyType: '',
  isActive: undefined as boolean | undefined,
  discountRate: 0,
  expiryDate: '',
};

// If there's no ID don't let editing of policy number

export const InsuranceModal: FC = (): ReactElement => {
  const t = useTranslation();
  const { current, setModal } = usePatientModalStore();

  const { urlQuery } = useUrlQuery();
  const insuranceId = urlQuery['insuranceId'];
  const nameId = usePatient.utils.id();
  const { data } = usePatient.document.insurances({ nameId });

  const selectedInsurance = data?.nodes.find(({ id }) => id === insuranceId);

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Insurance,
    onClose: () => setModal(undefined),
    disableBackdrop: true,
  });

  const [insurance, setInsurance] = useState(DEFAULT_INSURANCE);

  useEffect(() => {
    if (selectedInsurance) {
      setInsurance({
        policyNumber: selectedInsurance.policyNumber,
        providerName: selectedInsurance.insuranceProviders?.providerName ?? '',
        policyType: selectedInsurance.policyType,
        isActive: selectedInsurance.isActive,
        discountRate: selectedInsurance.discountPercentage,
        expiryDate: selectedInsurance.expiryDate,
      });
    } else {
      setInsurance(DEFAULT_INSURANCE);
    }
  }, [selectedInsurance]);

  const title =
    current === PatientModal.Insurance
      ? t('title.new-insurance')
      : t('title.edit-insurance');

  const handleInputChange =
    (field: string) => (event: ChangeEvent<HTMLInputElement>) =>
      setInsurance({ ...insurance, [field]: event.target.value });

  return (
    <Modal
      width={800}
      title={title}
      cancelButton={
        <DialogButton variant="cancel" onClick={() => setModal(undefined)} />
      }
      okButton={<DialogButton variant="save" onClick={() => {}} />}
    >
      <Stack gap={8} flexDirection="row">
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            label={t('label.policy-number')}
            Input={
              <BasicTextInput
                value={insurance.policyNumber}
                onChange={handleInputChange('policyNumber')}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.provider-name')}
            Input={
              <BasicTextInput
                value={insurance.providerName}
                onChange={handleInputChange('providerName')}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.policy-type')}
            Input={
              <BasicTextInput
                value={insurance.policyType}
                onChange={handleInputChange('policyType')}
              />
            }
          />
          <Box pt={2}>
            <Typography variant="body1">
              {t('label.is-active-insurance')}
            </Typography>
            <Box sx={{ gap: 2, display: 'flex', flexDirection: 'row' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Checkbox
                  checked={insurance.isActive}
                  onChange={() =>
                    setInsurance({ ...insurance, isActive: true })
                  }
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
                  checked={!insurance.isActive}
                  onChange={() =>
                    setInsurance({ ...insurance, isActive: false })
                  }
                />
                <Typography variant="body1">{t('label.inactive')}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            label={t('label.discount-rate')}
            Input={
              <BasicTextInput
                value={insurance.discountRate}
                onChange={handleInputChange('discountRate')}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.expiry-date')}
            Input={
              <BasicTextInput
                value={insurance.expiryDate}
                onChange={handleInputChange('expiryDate')}
              />
            }
          />
        </Box>
      </Stack>
    </Modal>
  );
};
