import React, { useState } from 'react';
import {
  Autocomplete,
  CloseIcon,
  MenuItem,
  useTranslation,
  Box,
  Button,
} from '@openmsupply-client/common';
import { ButtonGroup, Paper } from '@mui/material';
import { LocationRowFragment, useLocationList } from '../api';

interface LocationSearchInputProps {
  selectedLocation: LocationRowFragment | null;
  width?: number | string;
  onChange: (location: LocationRowFragment | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
  restrictedToLocationTypeId?: string | null;
  volumeRequired?: number;
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
  volumeRequired = 0,
}: LocationSearchInputProps) => {
  const t = useTranslation();
  const [filter, setFilter] = useState<'all' | 'empty' | 'available'>('all');

  const {
    query: { data, isLoading },
  } = useLocationList({
    sortBy: {
      direction: 'asc',
      key: 'name',
    },
    filterBy: { locationTypeId: { equalTo: restrictedToLocationTypeId } },
  });

  const locations = data?.nodes || [];

  // Filter locations based on selected filter
  const filteredLocations = locations.filter(location => {
    switch (filter) {
      case 'empty':
        return location.volumeUsed === 0;
      case 'available':
        return location.volume - location.volumeUsed > volumeRequired;
      case 'all':
      default:
        return true;
    }
  });

  const options: LocationOption[] = filteredLocations.map(l => ({
    value: l.id,
    label: formatLocationLabel(l),
    code: l.code,
  }));

  if (
    filteredLocations.length > 0 &&
    selectedLocation !== null &&
    selectedLocation !== undefined
  ) {
    options.push({ value: null, label: t('label.remove') });
  }

  // If the selected location doesn't match current filter, we need to handle this
  const shouldShowSelectedLocation =
    selectedLocation && !options.find(o => o.value === selectedLocation?.id);
  if (shouldShowSelectedLocation) {
    // Add the selected location to options even if it doesn't match filter
    const selectedLocationOption: LocationOption = {
      value: selectedLocation.id,
      label: formatLocationLabel(selectedLocation),
      code: selectedLocation.code,
    };
    options.unshift(selectedLocationOption);
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
      slots={{
        paper: ({ children, ...paperProps }) => (
          <Paper {...paperProps}>
            <Box
              sx={{
                p: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor: 'background.paper',
              }}
            >
              <ButtonGroup variant="outlined" size="small" fullWidth>
                <Button
                  variant={filter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setFilter('all')}
                  size="small"
                >
                  All
                </Button>
                <Button
                  variant={filter === 'empty' ? 'contained' : 'outlined'}
                  onClick={() => setFilter('empty')}
                  size="small"
                >
                  Empty
                </Button>
                <Button
                  variant={filter === 'available' ? 'contained' : 'outlined'}
                  onClick={() => setFilter('available')}
                  size="small"
                >
                  Available
                </Button>
              </ButtonGroup>
            </Box>
            {children}
          </Paper>
        ),
      }}
    />
  );
};

export const formatLocationLabel = (location: LocationRowFragment) => {
  const { name, locationType } = location;
  return `${name}${locationType ? ` (${locationType.name})` : ''}`;
};
