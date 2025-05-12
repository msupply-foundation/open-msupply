import React from 'react';

import {
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  createFilterOptions,
  CreateFilterOptionsConfig,
  FilterOptionsState,
  AutocompleteInputChangeReason,
  GlobalStyles,
} from '@mui/material';
import { AutocompleteOnChange, AutocompleteOptionRenderer } from './types';
import { BasicTextInput } from '../TextInput';
import {
  defaultOptionMapper,
  getDefaultOptionRenderer,
  useOpenStateWithKeyboard,
} from './utils';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  disableClearable?: boolean;
  getOptionDisabled?: (option: T) => boolean;
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: AutocompleteInputChangeReason
  ) => void;
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
  onInputChange,
}: AutocompleteListProps<T>): JSX.Element => {
  // Open by default
  const openOverrides = useOpenStateWithKeyboard({ open: true });
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
    <>
      {noOptionsText === '' && (
        <GlobalStyles
          styles={{
            '& .MuiAutocomplete-noOptions': {
              display: 'none',
            },
          }}
        />
      )}
      <MuiAutocomplete
        {...openOverrides}
        disableClearable={disableClearable}
        autoSelect={false}
        loading={loading}
        loadingText={loadingText}
        noOptionsText={noOptionsText}
        onChange={onChange}
        onInputChange={onInputChange}
        sx={{
          '& .MuiAutocomplete-inputRoot': {
            width: width ? `${width}px` : 'auto',
          },
        }}
        classes={{ noOptions: 'something' }}
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
    </>
  );
};
