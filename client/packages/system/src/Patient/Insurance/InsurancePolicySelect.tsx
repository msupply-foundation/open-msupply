import React, { FC, ReactElement } from 'react';
import { InsurancePolicyNodeType } from '@common/types';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';
import {
  Autocomplete,
  InputWithLabelRow,
  Typography,
} from '@common/components';

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

  const defaultValue = getDefaultValue(policyType, t);

  return (
    <InputWithLabelRow
      label={t('label.policy-type')}
      Input={
        <>
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

const getDefaultValue = (policyType: string, t: TypedTFunction<LocaleKey>) => {
  switch (policyType) {
    case InsurancePolicyNodeType.Personal:
      return {
        label: t('label.personal'),
        value: InsurancePolicyNodeType.Personal,
      };
    case InsurancePolicyNodeType.Business:
      return {
        label: t('label.business'),
        value: InsurancePolicyNodeType.Business,
      };
    default:
      return {
        label: t('label.personal'),
        value: InsurancePolicyNodeType.Personal,
      };
  }
};
