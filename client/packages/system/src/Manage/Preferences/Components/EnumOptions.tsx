import React from 'react';
import {
  Box,
  Checkbox,
  GenderType,
  getGenderTranslationKey,
  InputWithLabelRow,
  LocaleKey,
  PreferenceKey,
  TypedTFunction,
} from '@openmsupply-client/common';

interface EnumOption<T extends string> {
  value: T;
  label: string;
}

interface EnumOptionsProps<T extends string> {
  options: EnumOption<T>[];
  value: T[];
  onChange: (newValues: T[]) => void;
  disabled?: boolean;
}

export const EnumOptions = <T extends string>({
  value,
  onChange,
  disabled,
  options,
}: EnumOptionsProps<T>) => {
  const handleChange = (optionValue: T, checked: boolean) => {
    const newValue = checked
      ? [...value, optionValue]
      : value.filter(v => v !== optionValue);
    onChange(newValue);
  };

  return (
    <Box display="grid" gridTemplateColumns="1fr 1fr" width="100%">
      {options.map(option => (
        <InputWithLabelRow
          key={option.value}
          label={option.label}
          labelRight
          Input={
            <Checkbox
              disabled={disabled}
              checked={value.includes(option.value)}
              onChange={e => handleChange(option.value, e.target.checked)}
            />
          }
          labelWidth={'150px'}
          labelProps={{
            sx: {
              fontWeight: 'normal',
            },
          }}
          sx={{
            gap: 0.5,
          }}
        />
      ))}
    </Box>
  );
};

export const getEnumPreferenceOptions = (
  t: TypedTFunction<LocaleKey>,
  key: PreferenceKey
) => {
  switch (key) {
    case PreferenceKey.GenderOptions:
      return Object.values(GenderType)
        .filter(
          gender => !gender.includes('HORMONE') && !gender.includes('SURGICAL')
        )
        .map(gender => ({
          value: gender,
          label: t(getGenderTranslationKey(gender)),
        }));

    default:
      return [];
  }
};
