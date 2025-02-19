import React, { FC, ReactElement } from 'react';

import { useTranslation } from '@common/intl';
import { Autocomplete, InputWithLabelRow } from '@common/components';

import { usePatient } from '../api';

interface InsuranceProvidersSelectProps {
  insuranceProviderId: string;
  onChange: (value: string) => void;
}

export const InsuranceProvidersSelect: FC<InsuranceProvidersSelectProps> = ({
  insuranceProviderId,
  onChange,
}): ReactElement => {
  const t = useTranslation();
  const { data } = usePatient.document.insuranceProviders();
  const insuranceProviders = data?.nodes ?? [];

  const options = insuranceProviders.map(({ id, providerName }) => {
    return {
      label: providerName,
      value: id,
    };
  });

  const selectedInsurance = insuranceProviders.find(
    ({ id }) => id === insuranceProviderId
  );

  return (
    <InputWithLabelRow
      label={t('label.provider-name')}
      Input={
        <Autocomplete
          options={options}
          getOptionLabel={option => option.label}
          value={{
            label: selectedInsurance?.providerName ?? '',
            value: selectedInsurance?.id ?? '',
          }}
          onChange={(_, option) => {
            if (option) {
              onChange(option.value);
            }
          }}
        />
      }
      sx={{ '& .MuiAutocomplete-root': { flexGrow: 1, borderRadius: 1 } }}
    />
  );
};
