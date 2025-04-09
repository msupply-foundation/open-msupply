import React from 'react';
import { Autocomplete, useAuthContext } from '@openmsupply-client/common';

export const OTHER_FACILITY = 'other';

type FacilitySearchInputProps = {
  facilityId?: string | null;
  onChange: (newValue: string) => void;
  enteredAtOtherFacility?: {
    id: string;
    name: string;
  };
};

export const FacilitySearchInput = ({
  facilityId,
  onChange,
  enteredAtOtherFacility,
}: FacilitySearchInputProps) => {
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
      label: 'Other',
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
    />
  );
};
