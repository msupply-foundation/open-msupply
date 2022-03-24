import React from 'react';

import {
  Paper,
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  createFilterOptions,
  CreateFilterOptionsConfig,
  FilterOptionsState,
} from '@mui/material';
import { AutocompleteOnChange, AutocompleteOptionRenderer } from './types';
import { BasicTextInput } from '../TextInput';
import { defaultOptionMapper, getDefaultOptionRenderer } from './utils';

export type AutocompleteListProps<T> = {
  options: T[];
  filterOptions?: (options: T[], state: FilterOptionsState<T>) => T[];
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
  // annoying. typing this to T | T[] causes ts complaints, as it types the value as (T | T[])[]
  // as the correct typing relies on other props here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
};

export const AutocompleteList = <T,>({
  options,
  filterOptionConfig,
  filterOptions,
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
  value,
}: AutocompleteListProps<T>): JSX.Element => {
  const createdFilterOptions = createFilterOptions(filterOptionConfig);
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
      filterOptions={filterOptions ?? createdFilterOptions}
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
      value={value}
    />
  );
};
