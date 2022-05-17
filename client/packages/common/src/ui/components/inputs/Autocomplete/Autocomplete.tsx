import React, { PropsWithChildren } from 'react';
import {
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  createFilterOptions,
  CreateFilterOptionsConfig,
  AutocompleteInputChangeReason,
  AutocompleteProps as MuiAutocompleteProps,
  styled,
  Popper,
  PopperProps,
} from '@mui/material';
import {
  AutocompleteOption,
  AutocompleteOnChange,
  AutocompleteOptionRenderer,
} from './types';
import { BasicTextInput } from '../TextInput';
export interface AutocompleteProps<T>
  extends Omit<
    MuiAutocompleteProps<T, undefined, undefined, undefined>,
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
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: AutocompleteInputChangeReason
  ) => void;
  inputValue?: string;
  popperMinWidth?: number;
}

const StyledPopper = styled(Popper)(({ theme }) => ({
  boxShadow: theme.shadows[2],
}));

export function Autocomplete<T>({
  defaultValue,
  filterOptionConfig,
  getOptionDisabled,
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
  ...restOfAutocompleteProps
}: PropsWithChildren<AutocompleteProps<T>>): JSX.Element {
  const filterOptions = createFilterOptions(filterOptionConfig);

  const defaultRenderInput = (props: AutocompleteRenderInputParams) => (
    <BasicTextInput
      {...props}
      autoFocus={autoFocus}
      InputProps={{
        disableUnderline: false,
        style: props.disabled ? { paddingLeft: 0 } : {},
        ...props.InputProps,
      }}
      sx={{ width }}
    />
  );
  const defaultGetOptionLabel = (option: { label?: string } & T): string => {
    return option.label ?? '';
  };

  const CustomPopper: React.FC<PopperProps> = props => (
    <StyledPopper
      {...props}
      placement="bottom-start"
      style={{ minWidth: popperMinWidth, width: 'auto' }}
    />
  );

  return (
    <MuiAutocomplete
      {...restOfAutocompleteProps}
      inputValue={inputValue}
      onInputChange={onInputChange}
      disabled={disabled}
      isOptionEqualToValue={isOptionEqualToValue}
      defaultValue={defaultValue}
      disableClearable={!clearable}
      value={value}
      getOptionDisabled={getOptionDisabled}
      filterOptions={filterOptions}
      loading={loading}
      loadingText={loadingText}
      noOptionsText={noOptionsText}
      options={options}
      size="small"
      renderInput={renderInput || defaultRenderInput}
      renderOption={renderOption}
      onChange={onChange}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      PopperComponent={popperMinWidth ? CustomPopper : StyledPopper}
    />
  );
}
