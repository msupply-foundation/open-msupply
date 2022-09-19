import React from 'react';

import {
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
  filterOptionConfig?: CreateFilterOptionsConfig<T>;
  filterOptions?: (options: T[], state: FilterOptionsState<T>) => T[];
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
  value?: any;
  disableClearable?: boolean;
  getOptionDisabled?: (option: T) => boolean;
};

export const AutocompleteList = <T,>({
  options,
  filterOptions,
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
  value,
  disableClearable,
  getOptionDisabled,
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
      disableClearable={disableClearable}
      autoSelect={false}
      loading={loading}
      loadingText={loadingText}
      noOptionsText={noOptionsText}
      onChange={onChange}
      sx={{
        '& .MuiAutocomplete-inputRoot': {
          width: width ? `${width}px` : 'auto',
        },
      }}
      ListboxProps={{
        style: {
          minHeight: height ? `${height}` : 'auto',
          maxHeight: height ? `${height}` : 'auto',
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
      componentsProps={{
        paper: {
          sx: {
            backgroundColor: theme => theme.palette.background.toolbar,
            minHeight: height ? `${height}` : 'auto',
          },
        },
      }}
      disableCloseOnSelect={disableCloseOnSelect}
      multiple={multiple}
      getOptionLabel={getOptionLabel}
      limitTags={limitTags}
      inputValue={inputValue}
      clearText={clearText}
      value={value}
      getOptionDisabled={getOptionDisabled}
    />
  );
};
