import React, { FC, useEffect } from 'react';
import {
  Autocomplete,
  AutocompleteOption,
  CloseIcon,
  MenuItem,
  useTranslation,
} from '@openmsupply-client/common';
import { useLocation, LocationRowFragment } from '../api';

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

export const LocationSearchInput: FC<LocationSearchInputProps> = ({
  selectedLocation,
  width,
  onChange,
  disabled,
  autoFocus = false,
}) => {
  const t = useTranslation('inventory');
  const { fetchAsync, data, isLoading } = useLocation.document.listAll({
    direction: 'asc',
    key: 'name',
  });

  useEffect(() => {
    fetchAsync();
  }, []);

  const locations = data?.nodes || [];
  const options: AutocompleteOption<LocationOption>[] = locations.map(l => ({
    value: l.id,
    label: l.name,
    code: l.code,
  }));

  if (locations.length > 0 && selectedLocation !== null) {
    options.push({ value: null, label: t('label.remove') });
  }

  return (
    <Autocomplete
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Number(width)}
      clearable={false}
      value={
        selectedLocation && {
          value: selectedLocation.id,
          label: selectedLocation.name,
          code: selectedLocation.code,
        }
      }
      loading={isLoading}
      onChange={(_, option) => {
        onChange(locations.find(l => l.id === option?.value) || null);
      }}
      options={options}
      noOptionsText={t('messages.no-locations')}
      renderOption={optionRenderer}
      getOptionLabel={getOptionLabel}
    />
  );
};
