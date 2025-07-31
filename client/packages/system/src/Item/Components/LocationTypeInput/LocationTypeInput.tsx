import React from 'react';
import {
  Autocomplete,
  useBufferState,
  useTranslation,
} from '@openmsupply-client/common';
import { useLocationTypes } from '../../api/hooks/useLocationTypes';
import { LocationTypeFragment } from '../../api';

export interface LocationTypeInputProps {
  onChange: (name: LocationTypeFragment | null) => void;
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: string
  ) => void;
  width?: number;
  label?: string;
  value: LocationTypeFragment | null;
  disabled?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
}

export const LocationTypeInput = ({
  onChange,
  width = 250,
  value,
  label,
  disabled = false,
  fullWidth = false,
}: LocationTypeInputProps) => {
  const { data, isLoading } = useLocationTypes();
  const [buffer, setBuffer] = useBufferState(value);
  const t = useTranslation();

  const getOptionLabel = (locationType: LocationTypeFragment) =>
    t('label.location-temperature-range', {
      locationName: locationType.name,
      minTemperature: locationType.minTemperature,
      maxTemperature: locationType.maxTemperature,
    });

  return (
    <Autocomplete
      disabled={disabled}
      value={buffer && { ...buffer, label: buffer.name }}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        onChange(name);
      }}
      options={data?.locationTypes.nodes ?? []}
      getOptionLabel={getOptionLabel}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      inputProps={{ label }}
      fullWidth={fullWidth}
    />
  );
};
