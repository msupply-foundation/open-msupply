import React, { FC, useEffect, useState } from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { NameSearchInputProps, SearchInputPatient } from '../../utils';
import { getPatientOptionRenderer } from '../PatientOptionRenderer';
import { useSearchPatient } from '../utils';

export const PatientSearchInput: FC<NameSearchInputProps> = ({
  autoFocus,
  onChange,
  width = 250,
  value,
  disabled = false,
  sx,
  NoOptionsRenderer,
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

  const noResults =
    NoOptionsRenderer && patients.length === 0 && input !== '' && !isLoading;

  const options = noResults
    ? // This is a bit of hack to allow us to render a component inside the
      // Autocomplete when there are no options/results. Normally, only "text"
      // can be defined for "No Options", so we create this "dummy" option to
      // prevent the "No Options" behaviour, and then we specify a custom
      // renderer which (should) have a static component (e.g. a "Create new
      // patient" link) The type of this dummy value doesn't matter as it's
      // values never get rendered/referenced.
      // If a "NoOptionsRenderer" isn't specified, the component will behave as
      // normal (i.e. show the "noOptionsText" when no results are found)
      ([{ name: 'Dummy', value: '_' }] as unknown as SearchInputPatient[])
    : patients;

  return (
    <Autocomplete
      autoFocus={autoFocus}
      options={options}
      disabled={disabled}
      clearable={false}
      loading={isLoading}
      onChange={(_, name) => {
        if (name && !(name instanceof Array)) {
          onChange(name);
          setInput(name.name);
        }
      }}
      renderOption={noResults ? NoOptionsRenderer : PatientOptionRenderer}
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
        // reset input value to previous selected patient if user clicks away
        // without selecting a patient
        onBlur: () => setInput(value?.name ?? ''),
      }}
      filterOptions={options => options}
      sx={{ minWidth: width, ...sx }}
      noOptionsText={
        input.length > 0
          ? t('messages.no-matching-patients')
          : t('messages.type-to-search')
      }
    />
  );
};
