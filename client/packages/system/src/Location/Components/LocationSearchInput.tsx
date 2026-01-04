import React, { useState } from 'react';
import {
  Autocomplete,
  CloseIcon,
  MenuItem,
  useTheme,
  useTranslation,
  Box,
  Button,
  UNDEFINED_STRING_VALUE,
  useFormatNumber,
} from '@openmsupply-client/common';
import { ButtonGroup, Paper, Typography } from '@mui/material';
import { LocationRowFragment, useLocationList } from '../api';
import { checkInvalidLocationLines, getVolumeUsedPercentage } from '../utils';

interface LocationSearchInputProps {
  selectedLocation: LocationRowFragment | null;
  width?: number | string;
  onChange: (location: LocationRowFragment | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
  restrictedToLocationTypeId?: string | null;
  /** Enables the available volume filters */
  volumeRequired?: number;
  fullWidth?: boolean;
  enableAPI?: boolean;
  originalSelectedLocation?: LocationRowFragment | null;
  clearable?: boolean;
  /** Alternative to `clearable`, ideal for tables where the X takes up valuable real estate */
  includeRemoveOption?: boolean;
  placeholder?: string;
}

interface LocationOption {
  label: string;
  value: string | null;
  code?: string;
  volumeUsed: string;
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
    <MenuItem
      {...props}
      key={location.label}
      sx={{ justifyContent: 'space-between !important' }}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
          maxWidth: '80%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {getOptionLabel(location)}
      </span>
      <Typography
        component="span"
        sx={{ color: 'gray.dark', fontSize: 'smaller' }}
      >
        {location.volumeUsed}
      </Typography>
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
  enableAPI = true,
  originalSelectedLocation = null,
  clearable = false,
  includeRemoveOption = !clearable,
  placeholder,
}: LocationSearchInputProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { round } = useFormatNumber();

  const [filter, setFilter] = useState<LocationFilter>(LocationFilter.All);

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

  // Filter locations based on selected filter
  const filteredLocations = locations.filter(location => {
    switch (filter) {
      case LocationFilter.Empty:
        return location.stock?.totalCount === 0;

      case LocationFilter.Available:
        return (
          // If stock is already in the location, consider that location available
          location.id === originalSelectedLocation?.id ||
          location.volume - location.volumeUsed >= (volumeRequired ?? 0)
        );

      case LocationFilter.All:
      default:
        return true;
    }
  });

  const getVolumeUsedLabel = (location: LocationRowFragment) => {
    const volumeUsed = getVolumeUsedPercentage(location);

    return t('label.percent-used', {
      value:
        volumeUsed === undefined
          ? UNDEFINED_STRING_VALUE
          : round(volumeUsed, 2),
    });
  };

  const options: LocationOption[] = filteredLocations.map(l => ({
    value: l.id,
    label: formatLocationLabel(l),
    code: l.code,
    volumeUsed: getVolumeUsedLabel(l),
  }));

  if (
    includeRemoveOption &&
    filteredLocations.length > 0 &&
    selectedLocation !== null &&
    selectedLocation !== undefined
  ) {
    options.push({ value: null, label: t('label.remove'), volumeUsed: '0' });
  }

  // Define separately - even if the selected location doesn't match current
  // filter, we still want to show it as the selected option
  // Same goes if the location is not valid given the location type restriction
  const selectedLocationOption: LocationOption | null = selectedLocation
    ? {
        value: selectedLocation.id,
        label: formatLocationLabel(selectedLocation),
        code: selectedLocation.code,
        volumeUsed: getVolumeUsedLabel(selectedLocation),
      }
    : null;

  const isInvalidLocation = !!selectedLocation
    ? checkInvalidLocationLines(restrictedToLocationTypeId ?? null, [
        { location: selectedLocation },
      ])
    : null;

  const errorStyles = {
    borderColor: theme.palette.error.main,
    borderWidth: '2px',
    borderStyle: 'solid',
    borderRadius: '8px',
  };

  return (
    <Autocomplete
      fullWidth={fullWidth}
      sx={!!isInvalidLocation ? errorStyles : undefined}
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Number(width)}
      clearable={clearable}
      value={selectedLocationOption}
      loading={isLoading}
      onChange={(_, option) => {
        onChange(locations.find(l => l.id === option?.value) || null);
      }}
      options={options}
      noOptionsText={t('messages.no-locations')}
      renderOption={optionRenderer}
      getOptionLabel={getOptionLabel}
      placeholder={placeholder}
      isOptionEqualToValue={(option, value) => option.value === value?.value}
      slots={{
        paper:
          typeof volumeRequired === 'number'
            ? ({ children, ...paperProps }) => (
                <Paper {...paperProps} sx={{ minWidth: '300px' }}>
                  <LocationFilters filter={filter} setFilter={setFilter} />
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

const LocationFilters = ({
  filter,
  setFilter,
}: {
  filter: LocationFilter;
  setFilter: (filter: LocationFilter) => void;
}) => {
  const t = useTranslation();

  const handleFilterClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    filterType: LocationFilter
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setFilter(filterType);
  };

  return (
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
          variant={filter === LocationFilter.All ? 'contained' : 'outlined'}
          onMouseDown={e => handleFilterClick(e, LocationFilter.All)}
          color="gray"
          size="small"
        >
          {t('label.all')}
        </Button>
        <Button
          variant={filter === LocationFilter.Empty ? 'contained' : 'outlined'}
          onMouseDown={e => handleFilterClick(e, LocationFilter.Empty)}
          color="gray"
          size="small"
        >
          {t('label.empty')}
        </Button>
        <Button
          variant={
            filter === LocationFilter.Available ? 'contained' : 'outlined'
          }
          onMouseDown={e => handleFilterClick(e, LocationFilter.Available)}
          color="gray"
          size="small"
        >
          {t('label.available')}
        </Button>
      </ButtonGroup>
    </Box>
  );
};
