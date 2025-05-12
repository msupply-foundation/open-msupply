import React from 'react';
import {
  Autocomplete,
  AutocompleteOption,
  CloseIcon,
  MenuItem,
  useTranslation,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocationList } from '../api';

interface LocationSearchInputProps {
  selectedLocation: LocationRowFragment | null;
  width?: number | string;
  onChange: (location: LocationRowFragment | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
}

interface LocationOption {
  label: string;
  value: string | null;
  code?: string;
}

const getOptionLabel = (option: LocationOption) =>
  `${option.code} - ${option.label}`;

const optionRenderer = (
  props: React.HTMLAttributes<HTMLLIElement>,
  location: LocationOption
) => {
  const { style, ...rest } = props;

  return location.value === null ? (
    <MenuItem
      {...rest}
      sx={{
        ...style,
        display: 'inline-flex',
        flex: 1,
        width: '100%',
        borderTop: '1px solid',
        borderTopColor: 'divider',
      }}
      key={location.label}
    >
      <span style={{ whiteSpace: 'nowrap', flex: 1 }}>{location.label}</span>
      <CloseIcon sx={{ color: 'gray.dark' }} />
    </MenuItem>
  ) : (
    <MenuItem {...props} key={location.label}>
      <span style={{ whiteSpace: 'nowrap' }}>{getOptionLabel(location)}</span>
    </MenuItem>
  );
};

export const LocationSearchInput = ({
  selectedLocation,
  width,
  onChange,
  disabled,
  autoFocus = false,
}: LocationSearchInputProps) => {
  const t = useTranslation();
  const {
    query: { data, isLoading },
  } = useLocationList({
    sortBy: {
      direction: 'asc',
      key: 'name',
    },
  });

  const locations = data?.nodes || [];
  const options: AutocompleteOption<LocationOption>[] = locations.map(l => ({
    value: l.id,
    label: formatLocationLabel(l),
    code: l.code,
  }));

  if (
    locations.length > 0 &&
    selectedLocation !== null &&
    selectedLocation !== undefined
  ) {
    options.push({ value: null, label: t('label.remove') });
  }

  const selectedOption = options.find(o => o.value === selectedLocation?.id);

  return (
    <Autocomplete
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Number(width)}
      clearable={false}
      value={selectedOption || null}
      loading={isLoading}
      onChange={(_, option) => {
        onChange(locations.find(l => l.id === option?.value) || null);
      }}
      options={options}
      noOptionsText={t('messages.no-locations')}
      renderOption={optionRenderer}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, value) => option.value === value?.value}
    />
  );
};

export const formatLocationLabel = (location: LocationRowFragment) => {
  const { name, coldStorageType } = location;
  return `${name}${coldStorageType ? ` (${coldStorageType.name})` : ''}`;
};
