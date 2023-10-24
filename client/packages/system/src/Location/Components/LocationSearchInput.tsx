import React, { FC, useEffect } from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { useLocation, LocationRowFragment } from '../api';

interface LocationSearchInputProps {
  selectedLocation: LocationRowFragment | null;
  width?: number | string;
  onChange: (location: LocationRowFragment | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
}

export const LocationSearchInput: FC<LocationSearchInputProps> = ({
  selectedLocation,
  width,
  onChange,
  disabled,
  autoFocus = false,
}) => {
  const t = useTranslation();
  const { fetchAsync, data, isLoading } = useLocation.document.listAll({
    direction: 'asc',
    key: 'name',
  });

  useEffect(() => {
    fetchAsync();
  }, []);

  const locations = data?.nodes || [];
  const options = [
    ...locations.map(l => ({ value: l.id, label: l.name })),
    { value: null, label: t('label.remove') },
  ];

  return (
    <Autocomplete
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      clearable={false}
      value={
        selectedLocation && {
          value: selectedLocation.id,
          label: selectedLocation.name,
        }
      }
      loading={isLoading}
      onChange={(_, option) => {
        onChange(locations.find(l => l.id === option?.value) || null);
      }}
      options={options}
    />
  );
};
