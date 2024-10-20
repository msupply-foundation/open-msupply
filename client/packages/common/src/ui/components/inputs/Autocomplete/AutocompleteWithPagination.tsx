import React, {
  FC,
  PropsWithChildren,
  SyntheticEvent,
  useState,
  useEffect,
} from 'react';
import {
  Autocomplete as MuiAutocomplete,
  AutocompleteRenderInputParams,
  createFilterOptions,
  PopperProps,
  CircularProgress,
  Box,
} from '@mui/material';
import { BasicTextInput } from '../TextInput';
import { useDebounceCallback } from '@common/hooks';
import type { AutocompleteProps } from './Autocomplete';
import { StyledPopper } from './components';

const LOADER_HIDE_TIMEOUT = 500;

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
  const [isLoading, setIsLoading] = useState(true);

  const defaultRenderInput = (props: AutocompleteRenderInputParams) => (
    <BasicTextInput
      {...props}
      {...inputProps}
      autoFocus={autoFocus}
      InputProps={{
        ...props.InputProps,
        disableUnderline: false,
        endAdornment: (
          <>
            {isLoading || loading ? (
              <CircularProgress color="primary" size={18} />
            ) : null}
            {props.InputProps.endAdornment}
          </>
        ),
      }}
      sx={{ width }}
    />
  );

  const DefaultRenderOption: FC = (
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
    paginationDebounce
  );

  const listboxProps =
    !pagination || !onPageChange
      ? undefined
      : {
          onScroll: (event: SyntheticEvent) => {
            const listboxNode = event.currentTarget;
            const scrollPosition =
              listboxNode.scrollTop + listboxNode.clientHeight;

            // the scrollPosition should equal scrollHeight at the end of the list
            // but can be off by 0.5px, hence the +1 and greater than or equal to
            if (scrollPosition + 1 >= listboxNode.scrollHeight) {
              // Scroll bar is at the end, load more data
              const { page, first, total } = pagination;
              if (first * (page + 1) > total) return; // We have no more data to fetch
              debounceOnPageChange(page + 1);
            }
          },
        };

  const CustomPopper: React.FC<PopperProps> = props => (
    <StyledPopper
      {...props}
      placement="bottom-start"
      style={{ minWidth: popperMinWidth, width: 'auto' }}
    />
  );

  useEffect(() => {
    setTimeout(() => setIsLoading(false), LOADER_HIDE_TIMEOUT);
  }, [options]);

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
      renderOption={renderOption || DefaultRenderOption}
      onChange={onChange}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      PopperComponent={popperMinWidth ? CustomPopper : StyledPopper}
      ListboxProps={listboxProps}
    />
  );
}
