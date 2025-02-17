import { Autocomplete, InputWithLabelRow } from '@common/components';
import { useTranslation } from '@common/intl';
import { InsurancePolicyNodeType } from '@common/types';
import React, { FC, ReactElement } from 'react';

interface InsuranceProvidersSelectProps {
  onChange: (value: string) => void;
}

export const InsuranceProvidersSelect: FC<InsuranceProvidersSelectProps> = ({
  onChange,
}): ReactElement => {
  const t = useTranslation();

  // add graphql call to get insurance providers

  return (
    <InputWithLabelRow
      label={t('label.provider-name')}
      Input={
        <Autocomplete
          options={[
            {
              label: t('label.personal'),
              value: InsurancePolicyNodeType.Personal,
            },
            {
              label: t('label.business'),
              value: InsurancePolicyNodeType.Business,
            },
          ]}
          getOptionLabel={option => option.label}
          defaultValue={{
            label: InsurancePolicyNodeType.Personal
              ? t('label.personal')
              : t('label.business'),
            value: InsurancePolicyNodeType.Personal
              ? InsurancePolicyNodeType.Personal
              : InsurancePolicyNodeType.Business,
          }}
          onChange={(_, option) => {
            if (option) {
              onChange(option.value);
            }
          }}
          sx={{ '& .MuiAutocomplete-root': { flexGrow: 1 } }}
        />
      }
    />
  );
};
