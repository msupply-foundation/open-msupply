import React, { PropsWithChildren } from 'react';
import {
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  AutocompleteProps as MuiAutocompleteProps,
  ChipTypeMap,
  StandardTextFieldProps,
  AutocompleteFreeSoloValueMapping,
  ChipProps,
} from '@mui/material';
import { BasicTextInput } from '../TextInput';

export interface AutocompleteMultiProps<
  T,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends React.ElementType = ChipTypeMap['defaultComponent'],
> extends Omit<
    MuiAutocompleteProps<
      T,
      Multiple,
      DisableClearable,
      FreeSolo,
      ChipComponent
    >,
    'renderInput'
  > {
  inputProps?: StandardTextFieldProps;
  optionKey?: keyof T;
  renderInput?: (params: AutocompleteRenderInputParams) => React.ReactNode;
  width?: string;
}

export function AutocompleteMulti<
  T,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends React.ElementType = ChipTypeMap['defaultComponent'],
>({
  autoFocus,
  defaultValue,
  getOptionLabel,
  onChange,
  optionKey,
  options,
  renderInput,
  width = 'auto',
  slotProps,
  inputProps,
  ...restOfAutocompleteProps
}: PropsWithChildren<
  AutocompleteMultiProps<T, true, DisableClearable, FreeSolo, ChipComponent>
>): JSX.Element {
  const defaultRenderInput = (props: AutocompleteRenderInputParams) => (
    <BasicTextInput
      {...props}
      autoFocus={autoFocus}
      slotProps={{
        input: {
          disableUnderline: false,
          ...props?.InputProps,
        },
        htmlInput: {
          ...props.inputProps,
        },
        ...slotProps,
      }}
      sx={{ width }}
    />
  );

  const isTypeOfT = (
    _option: T | AutocompleteFreeSoloValueMapping<FreeSolo>
  ): _option is T => true;

  const defaultGetOptionLabel = (
    option: T | AutocompleteFreeSoloValueMapping<FreeSolo>
  ): string => {
    if (!!optionKey && isTypeOfT(option)) return String(option[optionKey]);

    return (option as { label?: string }).label ?? '';
  };

  return (
    <MuiAutocomplete
      {...restOfAutocompleteProps}
      slotProps={{
        chip: {
          sx: {
            backgroundColor: 'secondary.main',
            color: 'secondary.contrastText',
          },
        } as Partial<ChipProps<ChipComponent>>,
        paper: {
          elevation: 3,
          sx: {
            borderRadius: 4,
          },
        },
        ...slotProps,
      }}
      defaultValue={defaultValue}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      multiple
      onChange={onChange}
      options={options}
      renderInput={renderInput || defaultRenderInput}
      size="small"
      sx={{
        background: theme => theme.palette.background.drawer,
        borderRadius: 2,
        paddingTop: 0.5,
        paddingBottom: 0.5,
        '& .MuiChip-deleteIcon': {
          fill: theme => theme.palette.background.drawer,
          borderRadius: 2,
        },
      }}
    />
  );
}
