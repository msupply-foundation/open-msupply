import React, { FC, useEffect, useState } from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
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
  const t = useTranslation();

  const [input, setInput] = useState('');

  useEffect(() => {
    if (value) {
      setInput(value.name);
      search(value.name);
    }
  }, [value]);

  return (
    <Autocomplete
      options={patients}
      disabled={disabled}
      clearable={false}
      loading={isLoading}
      onChange={(_, name) => {
        if (name && !(name instanceof Array)) {
          onChange(name);
          setInput(name.name);
        }
      }}
      renderOption={PatientOptionRenderer}
      getOptionLabel={(option: SearchInputPatient) => option.name}
      isOptionEqualToValue={(option, value) => option.name === value.name}
      width={`${width}px`}
      popperMinWidth={width}
      value={value}
      inputValue={input}
      inputProps={{
        onChange: e => {
          const { value } = e.target;
          // update the input value and the search filter
          setInput(value);
          search(value);
        },
        // reset input value to previous selected patient if user clicks away without selecting a patient
        onBlur: () => setInput(value?.name ?? ''),
        // Trigger search when input is focused, and there is already an input value
        // so selected patient is shown in the dropdown
        onFocus: () => !!input && search(input),
      }}
      filterOptions={filterByNameAndCode}
      sx={{ minWidth: width }}
      noOptionsText={
        input.length > 0
          ? t('messages.no-matching-patients')
          : t('messages.type-to-search')
      }
    />
  );
};
