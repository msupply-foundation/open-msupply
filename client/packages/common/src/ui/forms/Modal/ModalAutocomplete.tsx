import React from 'react';
import {
  Autocomplete,
  AutocompleteRenderInputParams,
  Grid,
  TextField,
} from '@mui/material';
import { UseFormRegisterReturn } from 'react-hook-form';

export interface ModalAutocompleteProps {
  loading?: boolean;
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
  limitTags?: number;
  loadingText?: React.ReactNode;
  noOptionsText?: React.ReactNode;
  options: readonly unknown[];
  renderInput?: (params: AutocompleteRenderInputParams) => React.ReactNode;
  // renderOption?: (
  //   props: React.HTMLAttributes<HTMLLIElement>,
  //   option: T,
  //   state: AutocompleteRenderOptionState,
  // ) => React.ReactNode;
}

const inputStyle = {
  backgroundColor: '#f2f2f5',
  borderRadius: '8px',
  color: '#555770',
  padding: '4px 8px',
  width: '540px',
  '& .MuiInput-underline:before': { borderBottomWidth: 0 },
};

export const ModalAutocomplete: React.FC<ModalAutocompleteProps> = ({
  loading,
  inputProps,
  loadingText,
  noOptionsText,
  options,
  renderInput,
}) => {
  const defaultRenderInput = (params: AutocompleteRenderInputParams) => (
    <TextField {...params} sx={inputStyle} size="small" variant="standard" />
  );
  return (
    <Grid item xs={10} sx={{ marginBottom: '4px' }}>
      <Autocomplete
        loading={loading}
        loadingText={loadingText}
        noOptionsText={noOptionsText}
        options={options}
        sx={{ width: '540px' }}
        renderInput={renderInput || defaultRenderInput}
        {...inputProps}
      />
    </Grid>
  );
};
