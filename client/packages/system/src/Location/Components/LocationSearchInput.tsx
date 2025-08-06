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
  fullWidth?: boolean;
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

enum LocationFilter {
  All = 'all',
  Empty = 'empty',
  Available = 'available',
}

export const LocationSearchInput = ({
  selectedLocation,
  width,
  fullWidth,
  onChange,
  disabled,
  autoFocus = false,
  restrictedToLocationTypeId,
  volumeRequired,
}: LocationSearchInputProps) => {
  const t = useTranslation();
  const [filter, setFilter] = useState<LocationFilter>(LocationFilter.All);

  const handleFilterClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    filterType: LocationFilter
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setFilter(filterType);
  };

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
      case LocationFilter.Empty:
        return location.stock?.totalCount === 0;

      case LocationFilter.Available:
        return location.volume - location.volumeUsed >= (volumeRequired ?? 0);

      case LocationFilter.All:
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

  // Define separately - even if the selected location doesn't match current
  // filter, we still want to show it as the selected option
  const selectedLocationOption: LocationOption | null = selectedLocation
    ? {
        value: selectedLocation.id,
        label: formatLocationLabel(selectedLocation),
        code: selectedLocation.code,
      }
    : null;

  return (
    <Autocomplete
      fullWidth={fullWidth}
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Number(width)}
      clearable={false}
      value={selectedLocationOption}
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
        paper:
          typeof volumeRequired === 'number'
            ? ({ children, ...paperProps }) => (
                <Paper {...paperProps} sx={{ minWidth: '250px' }}>
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
                        variant={
                          filter === LocationFilter.All
                            ? 'contained'
                            : 'outlined'
                        }
                        onMouseDown={e =>
                          handleFilterClick(e, LocationFilter.All)
                        }
                        color="gray"
                        size="small"
                      >
                        {t('label.all')}
                      </Button>
                      <Button
                        variant={
                          filter === LocationFilter.Empty
                            ? 'contained'
                            : 'outlined'
                        }
                        onMouseDown={e =>
                          handleFilterClick(e, LocationFilter.Empty)
                        }
                        color="gray"
                        size="small"
                      >
                        {t('label.empty')}
                      </Button>
                      <Button
                        variant={
                          filter === LocationFilter.Available
                            ? 'contained'
                            : 'outlined'
                        }
                        onMouseDown={e =>
                          handleFilterClick(e, LocationFilter.Available)
                        }
                        color="gray"
                        size="small"
                      >
                        {t('label.available')}
                      </Button>
                    </ButtonGroup>
                  </Box>
                  {children}
                </Paper>
              )
            : undefined,
      }}
    />
  );
};

export const formatLocationLabel = (location: LocationRowFragment) => {
  const { name, locationType } = location;
  return `${name}${locationType ? ` (${locationType.name})` : ''}`;
};
