import React, { PropsWithChildren } from 'react';
import {
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  createFilterOptions,
  CreateFilterOptionsConfig,
  AutocompleteInputChangeReason,
  AutocompleteProps as MuiAutocompleteProps,
  PopperProps,
  SxProps,
  Theme,
  Box,
  Typography,
  FilterOptionsState,
  AutocompleteRenderOptionState,
} from '@mui/material';
import {
  AutocompleteOption,
  AutocompleteOnChange,
  AutocompleteOptionRenderer,
} from './types';
import { BasicTextInput, BasicTextInputProps } from '../TextInput';
import { StyledPopper } from './components';
import { useOpenStateWithKeyboard } from './utils';
import { useTranslation } from '@common/intl';
import { PlusCircleIcon } from '@common/icons';

export interface ClickableOptionConfig {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

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
  required?: boolean;
  textSx?: SxProps<Theme>;
  clickableOption?: ClickableOptionConfig;
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
  required,
  textSx,
  clickableOption,
  ...restOfAutocompleteProps
}: PropsWithChildren<AutocompleteProps<T>>): JSX.Element {
  const t = useTranslation();
  const openOverrides = useOpenStateWithKeyboard(restOfAutocompleteProps);

  const isClickableOption = (
    option: unknown
  ): option is ClickableOptionConfig => {
    return option === clickableOption;
  };

  const filterType = filterOptions ?? createFilterOptions(filterOptionConfig);
  const filter = (options: T[], state: FilterOptionsState<T>) => {
    const filtered = filterType(options, state);
    if (
      clickableOption &&
      !filtered.some(option => isClickableOption(option))
    ) {
      return [...filtered, clickableOption as T];
    }
    return filtered;
  };

  const defaultRenderInput = (props: AutocompleteRenderInputParams) => (
    <BasicTextInput
      required={required}
      {...props}
      {...inputProps}
      error={inputProps?.error}
      autoFocus={autoFocus}
      slotProps={{
        input: {
          sx: {
            p: '6.5px',
            '& .MuiInputBase-input': { pb: '6.5px !important' },
            ...textSx,
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

  const clickableOptionRenderer = (clickableOption: ClickableOptionConfig) => (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      gap={1}
      height={25}
      width="100%"
    >
      <Typography
        overflow="hidden"
        fontWeight="bold"
        textOverflow="ellipsis"
        sx={{
          whiteSpace: 'nowrap',
        }}
      >
        {clickableOption.label}
      </Typography>
      <PlusCircleIcon color="secondary" />
    </Box>
  );

  const optionsWithAdd = clickableOption
    ? [...options, clickableOption as T]
    : options;

  const customRenderOption = (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: T,
    state: AutocompleteRenderOptionState
  ) => {
    if (isClickableOption(option)) {
      return <li {...props}>{clickableOptionRenderer(option)}</li>;
    }

    if (renderOption) {
      return renderOption(props, option, state);
    }

    return (
      <li {...props}>{(getOptionLabel || defaultGetOptionLabel)(option)}</li>
    );
  };

  const shouldUseCustomRenderOption = clickableOption || renderOption;

  return (
    <MuiAutocomplete
      {...restOfAutocompleteProps}
      {...openOverrides}
      inputValue={inputValue}
      onInputChange={onInputChange}
      disabled={disabled}
      isOptionEqualToValue={(option, value) => {
        if (isClickableOption(option) || isClickableOption(value)) {
          return false;
        }
        return isOptionEqualToValue
          ? isOptionEqualToValue(option, value)
          : option === value;
      }}
      defaultValue={defaultValue}
      disableClearable={!clearable}
      value={value}
      getOptionDisabled={getOptionDisabled}
      filterOptions={filter}
      loading={loading}
      loadingText={loadingText ?? t('loading')}
      noOptionsText={noOptionsText ?? t('label.no-options')}
      options={optionsWithAdd}
      size="small"
      renderInput={renderInput || defaultRenderInput}
      renderOption={
        shouldUseCustomRenderOption ? customRenderOption : undefined
      }
      onChange={(_event, option, reason, details) => {
        if (isClickableOption(option) && clickableOption?.onClick) {
          clickableOption.onClick();
          return;
        }
        if (onChange) onChange(_event, option, reason, details);
      }}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      slots={{
        popper: popper,
      }}
      sx={{
        ...restOfAutocompleteProps.sx,
        paddingTop: 0.5,
        paddingBottom: 0.5,
      }}
    />
  );
}
