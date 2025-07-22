import React from 'react';
import {
  Select,
  GenderType,
  usePreference,
  useTranslation,
  getGenderTranslationKey,
  PreferenceKey,
} from '@openmsupply-client/common';

type GenderInputProps = {
  value: GenderType | null | undefined;
  onChange: (value: GenderType) => void;
  disabled?: boolean;
  width?: string | number;
};

export const GenderInput = ({
  value,
  onChange,
  disabled,
  width = 250,
}: GenderInputProps) => {
  const t = useTranslation();
  const {
    data: { genderOptions } = {
      genderOptions: [],
    },
  } = usePreference(PreferenceKey.GenderOptions);

  const mapGenderToOption = (value: GenderType) => ({
    id: value,
    label: t(getGenderTranslationKey(value)),
    value,
  });

  return (
    <Select
      value={value ?? ''}
      onChange={e => onChange(e.target.value as GenderType)}
      options={genderOptions.map(mapGenderToOption)}
      disabled={disabled}
      sx={{ width }}
    />
  );
};
