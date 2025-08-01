import React, { useEffect } from 'react';
import {
  Autocomplete,
  AutocompleteOption,
  CloseIcon,
  MenuItem,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocationList } from '../api';

interface LocationSearchInputProps {
  selectedLocation: LocationRowFragment | null;
  width?: number | string;
  onChange: (location: LocationRowFragment | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
  restrictedToLocationTypeId?: string | null;
  onInvalidLocation?: (invalid: boolean, message: string) => void;
  enableAPI?: boolean;
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
  restrictedToLocationTypeId,
  onInvalidLocation,
  enableAPI = true,
}: LocationSearchInputProps) => {
  const t = useTranslation();
  const theme = useTheme();

  const {
    query: { data, isLoading },
  } = useLocationList(
    {
      sortBy: {
        direction: 'asc',
        key: 'name',
      },
      filterBy: { locationTypeId: { equalTo: restrictedToLocationTypeId } },
    },
    undefined,
    enableAPI
  );

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

  const isInvalidLocation =
    !!selectedLocation &&
    !options.some(option => option.value === selectedLocation.id);

  // If the selected location is invalid, create an option to display it in the closed input
  const invalidLocationOption = isInvalidLocation
    ? {
        value: selectedLocation.id,
        label: formatLocationLabel(selectedLocation),
        code: selectedLocation.code,
      }
    : selectedOption || null;

  const locationValue = isInvalidLocation
    ? invalidLocationOption
    : selectedOption || null;

  useEffect(() => {
    onInvalidLocation?.(
      isInvalidLocation,
      isInvalidLocation ? t('messages.stock-location-invalid') : ''
    );
  }, [isInvalidLocation]);

  const errorStyles = {
    borderColor: theme.palette.error.main,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderRadius: '8px',
  };

  return (
    <Autocomplete
      sx={!!isInvalidLocation && onInvalidLocation ? errorStyles : undefined}
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Number(width)}
      clearable={false}
      value={locationValue}
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
  const { name, locationType } = location;
  return `${name}${locationType ? ` (${locationType.name})` : ''}`;
};
