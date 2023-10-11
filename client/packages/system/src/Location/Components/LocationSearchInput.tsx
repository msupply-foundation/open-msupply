import React, { FC, useEffect } from 'react';
import {
  Autocomplete,
  LocationNode,
  defaultOptionMapper,
  getDefaultOptionRenderer,
} from '@openmsupply-client/common';
import { useLocation, LocationRowFragment } from '../api';

interface LocationSearchInputProps {
  value: LocationRowFragment | null;
  width?: number | string;
  onChange: (location: LocationRowFragment | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
  allowUnassign?: boolean;
}

export const LocationSearchInput: FC<LocationSearchInputProps> = ({
  value,
  width,
  onChange,
  disabled,
  autoFocus = false,
  allowUnassign = false,
}) => {
  const { fetchAsync, data, isLoading } = useLocation.document.listAll({
    direction: 'asc',
    key: 'name',
  });

  useEffect(() => {
    fetchAsync();
  }, []);

  let options = data?.nodes ?? [];

  const unassignOption: LocationNode = {
    __typename: 'LocationNode',
    id: 'None',
    name: 'No location',
    onHold: false,
    code: 'No location',
    stock: {
      __typename: 'StockLineConnector',
      nodes: [],
      totalCount: 0,
    },
  };

  if (allowUnassign) {
    options = [...options, unassignOption];
  }

  return (
    <Autocomplete<LocationRowFragment>
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      clearable={false}
      value={
        value
          ? {
              ...value,
              label: value.name,
            }
          : {
              ...unassignOption,
              label: unassignOption.name,
            }
      }
      loading={isLoading}
      onChange={(_, location) => {
        onChange(location);
      }}
      options={defaultOptionMapper(options, 'name')}
      renderOption={getDefaultOptionRenderer('name')}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
