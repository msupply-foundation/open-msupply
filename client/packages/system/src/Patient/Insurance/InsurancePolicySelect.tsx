import React, { FC, ReactElement } from 'react';
import { InsurancePolicyNodeType } from '@common/types';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';
import { Autocomplete, InputWithLabelRow } from '@common/components';
import { FieldErrorWrapper, FieldErrorWrapperProps } from '@common/hooks';

interface InsurancePolicySelectProps {
  policyType: string;
  onChange: (value: string) => void;
  error?: boolean;
  setError?: (error: string) => void;
  required?: boolean;
}

export const InsurancePolicySelect: FC<InsurancePolicySelectProps> = ({
  policyType,
  onChange,
  error,
  setError,
  required,
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

  const errorProps = { error, setError, required };

  const defaultValue = getDefaultValue(policyType, t);

  return (
    <InputWithLabelRow
      label={t('label.policy-type')}
      Input={
        <Autocomplete
          clearable={false}
          options={options}
          value={defaultValue}
          onChange={(_, option) => {
            if (option) {
              onChange(option.value);
            }
          }}
          getOptionLabel={option => option.label}
          {...errorProps}
        />
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

export const InsurancePolicySelectWithError = ({
  code,
  label,
  value,
  required,
  customErrorState,
  customErrorMessage,
  ...insuranceSelectProps
}: Omit<InsurancePolicySelectProps, 'policyType'> &
  Omit<FieldErrorWrapperProps<InsurancePolicyNodeType>, 'children'>) => (
  <FieldErrorWrapper
    {...{ code, label, value, required, customErrorState, customErrorMessage }}
  >
    {errorProps => (
      <InsurancePolicySelect
        policyType={value}
        {...insuranceSelectProps}
        {...errorProps}
      />
    )}
  </FieldErrorWrapper>
);
