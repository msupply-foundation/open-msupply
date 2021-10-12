import React from 'react';

import {
  Paper,
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  createFilterOptions,
  CreateFilterOptionsConfig,
} from '@mui/material';
import { AutocompleteOnChange, AutocompleteOptionRenderer } from './types';
import { BasicTextInput } from '../TextInput';
import { getDefaultOptionRenderer } from './utils';

export type BaseAutocompleteListProps<T> = {
  options: readonly T[];

  filterOptionConfig?: CreateFilterOptionsConfig<T>;
  loading?: boolean;
  loadingText?: React.ReactNode;
  noOptionsText?: React.ReactNode;
  onChange?: AutocompleteOnChange<T>;
  width?: number;
  height?: number;

  renderInput?: (params: AutocompleteRenderInputParams) => React.ReactNode;
};

export type AutocompleteListPropsWithOptionsRenderer<T> =
  | {
      renderOption: AutocompleteOptionRenderer<T>;
      optionKey?: never;
    }
  | { renderOption?: never; optionKey: keyof T };

export type AutocompleteListProps<T> = BaseAutocompleteListProps<T> &
  AutocompleteListPropsWithOptionsRenderer<T>;

export const AutocompleteList = <T extends unknown>({
  options,
  filterOptionConfig,
  loading,
  loadingText,
  noOptionsText,
  onChange,
  width,
  height,
  renderInput,
  optionKey,
  renderOption,
}: AutocompleteListProps<T>): JSX.Element => {
  const filterOptions = createFilterOptions(filterOptionConfig);

  const optionRenderer = optionKey
    ? getDefaultOptionRenderer<T>(optionKey)
    : renderOption;

  return (
    <MuiAutocomplete
      loading={loading}
      loadingText={loadingText}
      noOptionsText={noOptionsText}
      onChange={onChange}
      sx={{
        '& .MuiAutocomplete-inputRoot': {
          width: width ? `${width}px` : 'auto',
        },
      }}
      renderInput={renderInput || (props => <BasicTextInput {...props} />)}
      filterOptions={filterOptions}
      open
      forcePopupIcon={false}
      options={options}
      renderOption={optionRenderer}
      PaperComponent={props => {
        return (
          <Paper
            sx={{
              minHeight: height ? `${height}` : 'auto',
            }}
          >
            {props.children}
          </Paper>
        );
      }}
    />
  );
};
