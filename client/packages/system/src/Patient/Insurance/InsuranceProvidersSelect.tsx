import React, { FC, ReactElement } from 'react';

import { useTranslation } from '@common/intl';
import {
  Autocomplete,
  InputWithLabelRow,
  Typography,
} from '@common/components';

import { useInsuranceProviders } from '../apiModern/hooks';

interface InsuranceProvidersSelectProps {
  insuranceProviderId: string;
  onChange: (value: string) => void;
}

export const InsuranceProvidersSelect: FC<InsuranceProvidersSelectProps> = ({
  insuranceProviderId,
  onChange,
}): ReactElement => {
  const t = useTranslation();
  const {
    query: { data },
  } = useInsuranceProviders();

  const options = data.map(({ id, providerName }) => {
    return {
      label: providerName,
      value: id,
    };
  });

  const selectedInsurance = data.find(({ id }) => id === insuranceProviderId);

  return (
    <InputWithLabelRow
      label={t('label.provider-name')}
      Input={
        <>
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
          <Typography
            sx={{
              color: 'primary.light',
              fontSize: '17px',
              marginRight: 0.5,
            }}
          >
            *
          </Typography>
        </>
      }
      sx={{ '& .MuiAutocomplete-root': { flexGrow: 1, borderRadius: 1 } }}
    />
  );
};
