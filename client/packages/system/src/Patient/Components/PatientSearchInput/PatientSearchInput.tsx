import React, { FC } from 'react';
import { Autocomplete, useBufferState } from '@openmsupply-client/common';
import {
  NameSearchInputProps,
  basicFilterOptions,
  filterByNameAndCode,
} from '../../utils';
import { usePatient } from '../../api';
import { getPatientOptionRenderer } from '../PatientOptionRenderer';

export const PatientSearchInput: FC<NameSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const { data, isLoading } = usePatient.document.list({
    sortBy: { key: 'name', direction: 'asc' },
  });
  const [buffer, setBuffer] = useBufferState(value);
  const PatientOptionRenderer = getPatientOptionRenderer();

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={buffer && { ...buffer, label: buffer.name }}
      filterOptionConfig={basicFilterOptions}
      filterOptions={filterByNameAndCode}
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={data?.nodes ?? []}
      renderOption={PatientOptionRenderer}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
