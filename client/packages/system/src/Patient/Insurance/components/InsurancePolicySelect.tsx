import { Autocomplete, InputWithLabelRow } from '@common/components';
import { useTranslation } from '@common/intl';
import { InsurancePolicyNodeType } from '@common/types';
import React, { FC, ReactElement } from 'react';

interface InsurancePolicySelectProps {
  policyType: string;
  onChange: (value: string) => void;
}

export const InsurancePolicySelect: FC<InsurancePolicySelectProps> = ({
  policyType,
  onChange,
}): ReactElement => {
  const t = useTranslation();

  const options = [
    {
      label: t('label.personal'),
      value: InsurancePolicyNodeType.Personal,
    },
    {
      label: t('label.business'),
      value: InsurancePolicyNodeType.Business,
    },
  ];

  const defaultValue = {
    label:
      policyType === InsurancePolicyNodeType.Personal
        ? t('label.personal')
        : t('label.business'),
    value:
      policyType === InsurancePolicyNodeType.Personal
        ? InsurancePolicyNodeType.Personal
        : InsurancePolicyNodeType.Business,
  };

  return (
    <InputWithLabelRow
      label={t('label.policy-type')}
      Input={
        <Autocomplete
          options={options}
          value={defaultValue}
          onChange={(_, option) => {
            if (option) {
              onChange(option.value);
            }
          }}
          getOptionLabel={option => option.label}
        />
      }
      sx={{ '& .MuiAutocomplete-root': { flexGrow: 1, borderRadius: 1 } }}
    />
  );
};
