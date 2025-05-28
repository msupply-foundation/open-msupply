import React from 'react';
import {
  Autocomplete,
  useAuthContext,
  useTranslation,
} from '@openmsupply-client/common';

export const OTHER_FACILITY = 'other';

type FacilitySearchInputProps = {
  facilityId?: string | null;
  onChange: (newValue: string) => void;
  enteredAtOtherFacility?: {
    id: string;
    name: string;
  };
  disabled?: boolean;
};

export const FacilitySearchInput = ({
  facilityId,
  onChange,
  enteredAtOtherFacility,
  disabled,
}: FacilitySearchInputProps) => {
  const t = useTranslation();
  const { store } = useAuthContext();

  const options = [
    ...(store
      ? [
          {
            label: store.name,
            value: store.nameId,
          },
        ]
      : []),
    ...(enteredAtOtherFacility
      ? [
          {
            label: enteredAtOtherFacility.name,
            value: enteredAtOtherFacility.id,
          },
        ]
      : []),
    {
      label: t('heading.other'),
      value: OTHER_FACILITY,
    },
  ];

  return (
    <Autocomplete
      sx={{ width: '100%' }}
      options={options}
      onChange={(_, value) => value && onChange(value.value)}
      value={options.find(option => option.value === facilityId) || null}
      clearable={false}
      disabled={disabled}
    />
  );
};
