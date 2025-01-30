import React, { PropsWithChildren } from 'react';
import {
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  createFilterOptions,
  CreateFilterOptionsConfig,
  AutocompleteInputChangeReason,
  AutocompleteProps as MuiAutocompleteProps,
  PopperProps,
} from '@mui/material';
import {
  AutocompleteOption,
  AutocompleteOnChange,
  AutocompleteOptionRenderer,
} from './types';
import { BasicTextInput, BasicTextInputProps } from '../TextInput';
import { StyledPopper } from './components';
import { useOpenStateWithKeyboard } from './utils';

export interface AutocompleteProps<T>
  extends Omit<
    MuiAutocompleteProps<T, undefined, boolean, undefined>,
    'renderInput'
  > {
  defaultValue?: AutocompleteOption<T> | null;
  getOptionDisabled?: (option: T) => boolean;
  filterOptionConfig?: CreateFilterOptionsConfig<T>;
  loading?: boolean;
  loadingText?: React.ReactNode;
  noOptionsText?: React.ReactNode;
  onChange?: AutocompleteOnChange<T>;
  options: readonly T[];
  width?: string;
  renderInput?: (params: AutocompleteRenderInputParams) => React.ReactNode;
  renderOption?: AutocompleteOptionRenderer<T>;
  value?: AutocompleteOption<T> | null;
  clearable?: boolean;
  isOptionEqualToValue?: (option: T, value: T) => boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  optionKey?: keyof T;
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: AutocompleteInputChangeReason
  ) => void;
  inputValue?: string;
  popperMinWidth?: number;
  inputProps?: BasicTextInputProps;
}

export function Autocomplete<T>({
  defaultValue,
  filterOptionConfig,
  filterOptions,
  getOptionDisabled,
  optionKey,
  loading,
  loadingText,
  noOptionsText,
  onChange,
  options,
  renderInput,
  renderOption,
  width = 'auto',
  value,
  isOptionEqualToValue,
  clearable = true,
  disabled,
  onInputChange,
  inputValue,
  autoFocus = false,
  getOptionLabel,
  popperMinWidth,
  inputProps,
  ...restOfAutocompleteProps
}: PropsWithChildren<AutocompleteProps<T>>): JSX.Element {
  const filter = filterOptions ?? createFilterOptions(filterOptionConfig);
  const openOverrides = useOpenStateWithKeyboard(restOfAutocompleteProps);
  const defaultRenderInput = (props: AutocompleteRenderInputParams) => (
    <BasicTextInput
      {...props}
      {...inputProps}
      autoFocus={autoFocus}
      slotProps={{
        input: {
          disableUnderline: false,
          sx: {
            paddingLeft: 1,
          },
          ...props.InputProps,
        },
        inputLabel: { shrink: true },
        htmlInput: {
          ...props.inputProps,
        },
      }}
      sx={{ minWidth: width }}
    />
  );
  const defaultGetOptionLabel = (option: T): string => {
    if (!!optionKey) return String(option[optionKey]);

    return (option as { label?: string }).label ?? '';
  };

  const CustomPopper = (props: PopperProps) => (
    <StyledPopper
      {...props}
      placement="bottom-start"
      style={{ minWidth: popperMinWidth, width: 'auto' }}
    />
  );
  const popper = popperMinWidth ? CustomPopper : StyledPopper;

  return (
    <MuiAutocomplete
      {...restOfAutocompleteProps}
      {...openOverrides}
      inputValue={inputValue}
      onInputChange={onInputChange}
      disabled={disabled}
      isOptionEqualToValue={isOptionEqualToValue}
      defaultValue={defaultValue}
      disableClearable={!clearable}
      value={value}
      getOptionDisabled={getOptionDisabled}
      filterOptions={filter}
      loading={loading}
      loadingText={loadingText}
      noOptionsText={noOptionsText}
      options={options}
      size="small"
      renderInput={renderInput || defaultRenderInput}
      renderOption={renderOption}
      onChange={onChange}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      slots={{
        popper: popper,
      }}
      sx={{
        background: theme =>
          disabled
            ? theme.palette.background.toolbar
            : theme.palette.background.drawer,
        borderRadius: 2,
        paddingTop: 0.5,
        paddingBottom: 0.5,
      }}
    />
  );
}
