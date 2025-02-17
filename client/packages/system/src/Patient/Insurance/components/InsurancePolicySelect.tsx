import { Autocomplete, InputWithLabelRow } from '@common/components';
import { useTranslation } from '@common/intl';
import { InsurancePolicyNodeType } from '@common/types';
import React, { FC, ReactElement } from 'react';

interface InsurancePolicySelectProps {
  onChange: (value: string) => void;
}

export const InsurancePolicySelect: FC<InsurancePolicySelectProps> = ({
  onChange,
}): ReactElement => {
  const t = useTranslation();
  return (
    <InputWithLabelRow
      label={t('label.policy-type')}
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
