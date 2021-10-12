import React, { PropsWithChildren } from 'react';
import {
  Autocomplete,
  AutocompleteChangeDetails,
  AutocompleteRenderInputParams,
  AutocompleteRenderOptionState,
  createFilterOptions,
} from '@mui/material';
import { BasicTextInput } from '@openmsupply-client/common';

export interface ModalAutocompleteProps<T> {
  filterOptions: any;
  loading?: boolean;
  limitTags?: number;
  loadingText?: React.ReactNode;
  noOptionsText?: React.ReactNode;
  onChange?: (
    event: React.SyntheticEvent,
    value: T | null,
    reason: string,
    details?: AutocompleteChangeDetails<T>
  ) => void;
  options: readonly T[];
  renderInput?: (params: AutocompleteRenderInputParams) => React.ReactNode;
  width?: number;
  renderOption?: (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: T,
    state: AutocompleteRenderOptionState
  ) => React.ReactNode;
}

export { createFilterOptions };

export function ModalAutocomplete<T>({
  filterOptions,
  loading,
  loadingText,
  noOptionsText,
  onChange,
  options,
  renderInput,
  renderOption,
  width,
}: PropsWithChildren<ModalAutocompleteProps<T>>): JSX.Element {
  return (
    <Autocomplete<T>
      sx={{
        '& .MuiAutocomplete-inputRoot': {
          width: width ? `${width}px` : 'auto',
        },
      }}
      filterOptions={filterOptions}
      loading={loading}
      loadingText={loadingText}
      noOptionsText={noOptionsText}
      options={options}
      renderInput={renderInput || BasicTextInput}
      renderOption={renderOption}
      onChange={onChange}
    />
  );
}
