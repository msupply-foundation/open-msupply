import React from 'react';
import { Autocomplete, useBufferState } from '@openmsupply-client/common';
import { useColdStorageTypes } from '../../api/hooks/useColdStorageTypes';
import { ColdStorageTypeFragment } from '../../api';

export interface ColdStorageTypeInputProps {
  onChange: (name: ColdStorageTypeFragment | null) => void;
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: string
  ) => void;
  width?: number;
  label?: string;
  value: ColdStorageTypeFragment | null;
  disabled?: boolean;
  clearable?: boolean;
}

const getOptionLabel = (coldStorageType: ColdStorageTypeFragment) =>
  `${coldStorageType.name} (${coldStorageType.minTemperature}°C - ${coldStorageType.maxTemperature}°C)`;

export const ColdStorageTypeInput = ({
  onChange,
  width = 250,
  value,
  label,
  disabled = false,
}: ColdStorageTypeInputProps) => {
  const { data, isLoading } = useColdStorageTypes();
  const [buffer, setBuffer] = useBufferState(value);

  return (
    <Autocomplete
      disabled={disabled}
      value={buffer && { ...buffer, label: buffer.name }}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        onChange(name);
      }}
      options={data?.coldStorageTypes.nodes ?? []}
      getOptionLabel={getOptionLabel}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      inputProps={{ label }}
    />
  );
};
