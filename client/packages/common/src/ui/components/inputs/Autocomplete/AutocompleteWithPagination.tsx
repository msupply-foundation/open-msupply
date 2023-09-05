import React, { FC, PropsWithChildren, SyntheticEvent } from 'react';
import {
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  createFilterOptions,
  styled,
  Popper,
  PopperProps,
  CircularProgress,
  Box,
} from '@mui/material';
import { BasicTextInput } from '../TextInput';
import { useDebounceCallback } from '@common/hooks';
import type { AutocompleteProps } from './Autocomplete';

export interface AutocompleteWithPaginationProps<T>
  extends AutocompleteProps<T> {
  pagination?: {
    page: number;
    first: number;
    offset: number;
    total: number;
  };
  paginationDebounce?: number;
  onPageChange?: (page: number) => void;
}

const StyledPopper = styled(Popper)(({ theme }) => ({
  boxShadow: theme.shadows[2],
}));

export function AutocompleteWithPagination<T>({
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
  pagination,
  paginationDebounce,
  onPageChange,
  ...restOfAutocompleteProps
}: PropsWithChildren<AutocompleteWithPaginationProps<T>>) {
  const filter = filterOptions ?? createFilterOptions(filterOptionConfig);

  const defaultRenderInput = (props: AutocompleteRenderInputParams) => (
    <BasicTextInput
      {...props}
      {...inputProps}
      autoFocus={autoFocus}
      InputProps={{
        ...props.InputProps,
        disableUnderline: false,
        // style: props.disabled ? { paddingLeft: 0 } : {},
        endAdornment: (
          <>
            {loading ? <CircularProgress color="primary" size={18} /> : null}
            {props.InputProps.endAdornment}
          </>
        ),
      }}
      sx={{ width }}
    />
  );

  const defaultRenderOption: FC = (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: { id?: string; label?: string } & T
  ) => (
    <Box component="li" {...props} key={option.id}>
      {option.label}
    </Box>
  );

  const defaultGetOptionLabel = (option: T): string => {
    if (!!optionKey) return String(option[optionKey]);

    return (option as { label?: string }).label ?? '';
  };

  const debounceOnPageChange = useDebounceCallback(
    (page: number) => {
      onPageChange && onPageChange(page);
    },
    [onPageChange],
    paginationDebounce || 500
  );

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
      filterOptions={filter}
      loading={loading}
      loadingText={loadingText}
      noOptionsText={noOptionsText}
      options={options}
      size="small"
      renderInput={renderInput || defaultRenderInput}
      renderOption={renderOption || defaultRenderOption}
      onChange={onChange}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      PopperComponent={popperMinWidth ? CustomPopper : StyledPopper}
      ListboxProps={
        (pagination &&
          onPageChange && {
            onScroll: (event: SyntheticEvent) => {
              const listboxNode = event.currentTarget;
              if (
                listboxNode.scrollTop + listboxNode.clientHeight ===
                listboxNode.scrollHeight
              ) {
                // testing
                console.log('at the end', pagination);

                // Scroll bar is at the end, load more data
                const { page, first, total } = pagination;
                if (first * (page + 1) > total) return; // We have no more data to fetch
                debounceOnPageChange(page + 1);
              }
            },
          }) ||
        undefined
      }
    />
  );
}
