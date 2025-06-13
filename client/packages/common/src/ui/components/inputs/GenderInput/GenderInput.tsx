import React from 'react';
import { Select } from '@common/components';
import { GenderType } from '@common/types';
import { LocaleKey, useTranslation } from '@common/intl';
// import { getGenderTranslationKey } from 'packages/system/src/Patient/PatientView';

type GenderInputProps = {
  allowedValues?: GenderType[];
  value: GenderType | null | undefined;
  onChange: (value: GenderType) => void;
  disabled?: boolean;
  width?: string | number;
};

export function getGenderTranslationKey(gender: GenderType): LocaleKey {
  switch (gender) {
    case GenderType.Female:
      return 'gender.female';
    case GenderType.Male:
      return 'gender.male';
    case GenderType.NonBinary:
      return 'gender.non-binary';
    case GenderType.Transgender:
      return 'gender.transgender';
    case GenderType.TransgenderFemale:
    case GenderType.TransgenderFemaleHormone:
    case GenderType.TransgenderFemaleSurgical:
      return 'gender.transgender-female';
    case GenderType.TransgenderMale:
    case GenderType.TransgenderMaleHormone:
    case GenderType.TransgenderMaleSurgical:
      return 'gender.transgender-male';
    case GenderType.Unknown:
      return 'gender.unknown';
  }
}

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
