import React, { FC } from 'react';
import { Autocomplete } from '@openmsupply-client/common';
import {
  NameSearchInputProps,
  SearchInputPatient,
  filterByNameAndCode,
} from '../../utils';
import { getPatientOptionRenderer } from '../PatientOptionRenderer';
import { useSearchPatient } from '../utils';

export const PatientSearchInput: FC<NameSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const PatientOptionRenderer = getPatientOptionRenderer();
  const { isLoading, patients, search } = useSearchPatient();

  return (
    <Autocomplete
      options={patients}
      disabled={disabled}
      clearable={false}
      loading={isLoading}
      onInputChange={(_, value) => search(value)}
      onChange={(_, name) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
      renderOption={PatientOptionRenderer}
      getOptionLabel={(option: SearchInputPatient) => option.name}
      width={`${width}px`}
      popperMinWidth={width}
      defaultValue={value && { ...value, label: value.name }}
      filterOptions={filterByNameAndCode}
      sx={{ minWidth: width }}
      noOptionsText=""
    />
  );
};
