import React from 'react';
import {
  Select,
  GenderTypeNode,
  usePreferences,
  useTranslation,
  getGenderTranslationKey,
} from '@openmsupply-client/common';

type GenderInputProps = {
  value: GenderTypeNode | null | undefined;
  onChange: (value: GenderTypeNode) => void;
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
  const { genderOptions = [] } = usePreferences();

  const mapGenderToOption = (value: GenderTypeNode) => ({
    id: value,
    label: t(getGenderTranslationKey(value)),
    value,
  });

  return (
    <Select
      value={value ?? ''}
      onChange={e => onChange(e.target.value as GenderTypeNode)}
      options={genderOptions.map(mapGenderToOption)}
      disabled={disabled}
      sx={{ width }}
    />
  );
};
