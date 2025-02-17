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
import {
  Box,
  InsurancePolicyNodeType,
  Stack,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { InsurancePolicySelect } from './components';
import { InsuranceProvidersSelect } from './components/InsuranceProvidersSelect';

const DEFAULT_INSURANCE = {
  policyNumberFamily: '',
  policyNumberPerson: '',
  providerName: '',
  insuranceProviderId: '',
  policyType: '',
  isActive: undefined as boolean | undefined,
  discountRate: 0,
  expiryDate: '',
};

export const InsuranceModal: FC = (): ReactElement => {
  const t = useTranslation();
  const { current, setModal } = usePatientModalStore();

  const { urlQuery } = useUrlQuery();
  const insuranceId = urlQuery['insuranceId'];

  const nameId = usePatient.utils.id();
  const { data } = usePatient.document.insurances({ nameId });
  const selectedInsurance = data?.nodes.find(({ id }) => id === insuranceId);

  const [insurance, setInsurance] = useState(DEFAULT_INSURANCE);

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Insurance,
    onClose: () => setModal(undefined),
    disableBackdrop: true,
  });

  useEffect(() => {
    if (selectedInsurance) {
      const {
        policyNumberFamily,
        policyNumberPerson,
        insuranceProviderId,
        insuranceProviders,
        policyType,
        isActive,
        discountPercentage,
        expiryDate,
      } = selectedInsurance;

      setInsurance({
        policyType,
        isActive,
        expiryDate,
        insuranceProviderId: insuranceProviderId ?? '',
        policyNumberFamily: policyNumberFamily ?? '',
        policyNumberPerson: policyNumberPerson ?? '',
        providerName: insuranceProviders?.providerName ?? '',
        discountRate: discountPercentage,
      });
    } else {
      setInsurance(DEFAULT_INSURANCE);
    }
  }, [selectedInsurance]);

  const handleInputChange =
    (field: string) => (event: ChangeEvent<HTMLInputElement>) =>
      setInsurance({ ...insurance, [field]: event.target.value });

  return (
    <Modal
      width={800}
      title={
        current === PatientModal.Insurance
          ? t('title.new-insurance')
          : t('title.edit-insurance')
      }
      cancelButton={
        <DialogButton variant="cancel" onClick={() => setModal(undefined)} />
      }
      okButton={<DialogButton variant="save" onClick={() => {}} />}
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
                value={insurance.policyNumberFamily}
                onChange={handleInputChange('policyNumberFamily')}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.policy-number-person')}
            Input={
              <BasicTextInput
                value={insurance.policyNumberPerson}
                onChange={handleInputChange('policyNumberPerson')}
              />
            }
          />
          <InsurancePolicySelect
            policyType={insurance.policyType}
            onChange={(value: string) =>
              setInsurance({
                ...insurance,
                policyType: value as InsurancePolicyNodeType,
              })
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
          {/* <BaseDatePickerInput value={insurance.expiryDate} /> */}
          <InputWithLabelRow
            label={t('label.expiry-date')}
            Input={
              <BasicTextInput
                value={insurance.expiryDate}
                onChange={handleInputChange('expiryDate')}
              />
            }
          />
          <InsuranceProvidersSelect
            insuranceProviderId={insurance.insuranceProviderId}
            onChange={(value: string) => {
              setInsurance({ ...insurance, providerName: value });
            }}
          />
          <InputWithLabelRow
            label={t('label.discount-rate')}
            Input={
              <BasicTextInput
                value={insurance.discountRate}
                onChange={handleInputChange('discountRate')}
              />
            }
          />
        </Box>
      </Stack>
    </Modal>
  );
};
