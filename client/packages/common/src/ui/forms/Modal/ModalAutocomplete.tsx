import React, { PropsWithChildren } from 'react';
import {
  Autocomplete,
  AutocompleteChangeDetails,
  AutocompleteRenderInputParams,
  AutocompleteRenderOptionState,
  createFilterOptions,
  Grid,
  TextField,
} from '@mui/material';

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

const inputStyle = {
  backgroundColor: '#f2f2f5',
  borderRadius: '8px',
  padding: '4px 8px',
  '& .MuiInput-underline:before': { borderBottomWidth: 0 },
  '& .MuiInput-input': { color: '#555770' },
};

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
  const defaultRenderInput = (params: AutocompleteRenderInputParams) => (
    <TextField
      {...params}
      sx={{ ...inputStyle, width: width ? `${width}px` : 'auto' }}
      size="small"
      variant="standard"
    />
  );
  return (
    <Grid item xs={10} sx={{ marginBottom: '4px' }}>
      <Autocomplete<T>
        filterOptions={filterOptions}
        loading={loading}
        loadingText={loadingText}
        noOptionsText={noOptionsText}
        options={options}
        renderInput={renderInput || defaultRenderInput}
        renderOption={renderOption}
        onChange={onChange}
      />
    </Grid>
  );
}
