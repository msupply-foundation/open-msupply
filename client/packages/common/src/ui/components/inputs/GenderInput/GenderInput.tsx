import React from 'react';
import { Select } from '@common/components';
import { GenderType } from '@common/types';
import { useTranslation } from '@common/intl';
import { getGenderTranslationKey } from '@common/utils';

type GenderInputProps = {
  allowedValues?: GenderType[];
  value: GenderType | null | undefined;
  onChange: (value: GenderType) => void;
  disabled?: boolean;
  width?: string | number;
};

export const GenderInput = ({
  // We'll make these the defaults for now, could be customised by country requirements later
  allowedValues = [
    GenderType.Female,
    GenderType.Male,
    GenderType.NonBinary,
    GenderType.Unknown,
  ],
  value,
  onChange,
  disabled,
  width = 250,
}: GenderInputProps) => {
  const t = useTranslation();

  const mapGenderToOption = (value: GenderType) => ({
    id: value,
    label: t(getGenderTranslationKey(value)),
    value,
  });
  return (
    <Select
      value={value ?? ''}
      onChange={e => onChange(e.target.value as GenderType)}
      options={allowedValues.map(mapGenderToOption)}
      disabled={disabled}
      sx={{ width }}
    />
  );
};
