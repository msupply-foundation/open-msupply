import React, { FC, useEffect } from 'react';
import {
  Autocomplete,
  LocationNode,
  defaultOptionMapper,
  getDefaultOptionRenderer,
  useTranslation,
} from '@openmsupply-client/common';
import { useLocation, LocationRowFragment } from '../api';

interface LocationSearchInputProps {
  value: LocationRowFragment | null;
  width?: number | string;
  onChange: (location: LocationRowFragment | null) => void;
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
  const t = useTranslation();
  const { fetchAsync, data, isLoading } = useLocation.document.listAll({
    direction: 'asc',
    key: 'name',
  });

  useEffect(() => {
    fetchAsync();
  }, []);

  const unassignOption: LocationNode = {
    __typename: 'LocationNode',
    id: 'None',
    name: t('label.remove'),
    onHold: false,
    code: 'No location',
    stock: {
      __typename: 'StockLineConnector',
      nodes: [],
      totalCount: 0,
    },
  };

  let options = data?.nodes ?? [];
  options = [...options, unassignOption];

  return (
    <Autocomplete<LocationRowFragment>
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
      options={defaultOptionMapper(options, 'name')}
      renderOption={getDefaultOptionRenderer('name')}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
