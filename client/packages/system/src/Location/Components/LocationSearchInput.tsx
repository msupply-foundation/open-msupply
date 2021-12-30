import React, { FC } from 'react';
import {
  Autocomplete,
  defaultOptionMapper,
  getDefaultOptionRenderer,
} from '@openmsupply-client/common';
import { useLocations } from '../hooks';
import { Location } from '../types';

interface LocationSearchInputProps {
  value: Location | null;
  width: number;
  onChange: (location: Location | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
}

export const LocationSearchInput: FC<LocationSearchInputProps> = ({
  value,
  width,
  onChange,
  disabled,
  autoFocus = false,
}) => {
  const { data, isLoading } = useLocations();

  return (
    <Autocomplete<Location>
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      clearable={false}
      value={
        value && {
          ...value,
          label: value.name,
        }
      }
      loading={isLoading}
      onChange={(_, location) => {
        onChange(location);
      }}
      options={defaultOptionMapper(data?.nodes ?? [], 'name')}
      renderOption={getDefaultOptionRenderer('name')}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
