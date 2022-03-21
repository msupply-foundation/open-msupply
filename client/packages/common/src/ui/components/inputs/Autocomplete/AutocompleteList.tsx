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
import { defaultOptionMapper, getDefaultOptionRenderer } from './utils';

export type AutocompleteListProps<T> = {
  options: T[];
  filterOptionConfig?: CreateFilterOptionsConfig<T>;
  loading?: boolean;
  loadingText?: React.ReactNode;
  noOptionsText?: React.ReactNode;
  onChange?: AutocompleteOnChange<T | T[]>;
  width?: number;
  height?: number;
  renderOption?: AutocompleteOptionRenderer<T>;
  optionKey?: keyof T;
  renderInput?: (params: AutocompleteRenderInputParams) => React.ReactNode;
  disableCloseOnSelect?: boolean;
  multiple?: boolean;
  getOptionLabel?: (option: T) => string;
  limitTags?: number;
  inputValue?: string;
  clearText?: string;
};

export const AutocompleteList = <T,>({
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
  disableCloseOnSelect,
  multiple,
  getOptionLabel,
  limitTags,
  inputValue,
  clearText,
}: AutocompleteListProps<T>): JSX.Element => {
  const filterOptions = createFilterOptions(filterOptionConfig);

  const optionRenderer = optionKey
    ? getDefaultOptionRenderer<T>(optionKey)
    : renderOption;

  let mappedOptions: T[] = [];

  if (optionKey) {
    mappedOptions = defaultOptionMapper(options, optionKey);
  } else {
    mappedOptions = options;
  }

  return (
    <MuiAutocomplete
      autoSelect={false}
      loading={loading}
      loadingText={loadingText}
      noOptionsText={noOptionsText}
      onChange={onChange}
      sx={{
        '& .MuiAutocomplete-listbox': {
          minHeight: height ? `${height}` : 'auto',
          maxHeight: height ? `${height}` : 'auto',
        },
        '& .MuiAutocomplete-inputRoot': {
          width: width ? `${width}px` : 'auto',
        },
      }}
      renderInput={
        renderInput || (props => <BasicTextInput {...props} autoFocus />)
      }
      filterOptions={filterOptions}
      open
      forcePopupIcon={false}
      options={mappedOptions}
      renderOption={optionRenderer}
      ListboxProps={{
        style: {
          height: height ? `${height}` : 'auto',
          maxHeight: height ? `${height}` : 'auto',
        },
      }}
      PaperComponent={props => (
        <Paper
          sx={{
            backgroundColor: theme => theme.palette.background.toolbar,
            minHeight: height ? `${height}` : 'auto',
          }}
        >
          {props.children}
        </Paper>
      )}
      disableCloseOnSelect={disableCloseOnSelect}
      multiple={multiple}
      getOptionLabel={getOptionLabel}
      limitTags={limitTags}
      inputValue={inputValue}
      clearText={clearText}
    />
  );
};
