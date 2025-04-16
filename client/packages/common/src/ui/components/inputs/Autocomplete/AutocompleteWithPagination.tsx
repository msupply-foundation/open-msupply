import React, {
  FC,
  PropsWithChildren,
  SyntheticEvent,
  useState,
  useEffect,
  useMemo,
  useRef,
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
import { ArrayUtils } from '@common/utils';
import { RecordWithId } from '@common/types';
import { useOpenStateWithKeyboard } from '@common/components';
import { useTranslation } from '@common/intl';

const LOADER_HIDE_TIMEOUT = 500;

export interface AutocompleteWithPaginationProps<T extends RecordWithId>
  extends Omit<AutocompleteProps<T>, 'options'> {
  pageNumber: number;
  rowsPerPage: number;
  totalRows: number;
  paginationDebounce?: number;
  pages: { data: { nodes: T[] } }[];
  onPageChange?: (page: number) => void;
  mapOptions?: (items: T[]) => (T & { label: string })[];
}

export function AutocompleteWithPagination<T extends RecordWithId>({
  defaultValue,
  filterOptionConfig,
  filterOptions,
  getOptionDisabled,
  optionKey,
  loading,
  loadingText,
  noOptionsText,
  onChange,
  pages,
  rowsPerPage,
  totalRows,
  pageNumber,
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
  paginationDebounce,
  onPageChange,
  mapOptions,
  ...restOfAutocompleteProps
}: PropsWithChildren<AutocompleteWithPaginationProps<T>>) {
  const t = useTranslation();
  const filter = filterOptions ?? createFilterOptions(filterOptionConfig);
  const [isLoading, setIsLoading] = useState(true);
  const lastOptions = useRef<T[]>([]);
  const openOverrides = useOpenStateWithKeyboard(restOfAutocompleteProps);

  const options = useMemo(() => {
    if (!pages) {
      return lastOptions.current;
    }
    const records = ArrayUtils.flatMap(pages, page => page.data?.nodes ?? []);

    if (!!value && !records.some(r => r.id === value.id)) {
      records.unshift(value);
    }

    const newOptions = mapOptions
      ? mapOptions(records)
      : records.map(r => ({
          label: getOptionLabel ? getOptionLabel(r) : r.id,
          ...r,
        }));

    lastOptions.current = newOptions;

    return newOptions;
  }, [pages, value]);

  const defaultRenderInput = (props: AutocompleteRenderInputParams) => (
    <BasicTextInput
      {...props}
      {...inputProps}
      autoFocus={autoFocus}
      slotProps={{
        input: {
          ...props.InputProps,
          disableUnderline: false,
          sx: {
            paddingY: '4px !important',
          },
          endAdornment: (
            <>
              {isLoading || loading ? (
                <CircularProgress color="primary" size={18} />
              ) : null}
              {props.InputProps.endAdornment}
            </>
          ),
        },
        htmlInput: {
          ...props?.inputProps,
        },
      }}
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

  const listboxProps = !onPageChange
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
            if (rowsPerPage * (pageNumber + 1) > totalRows) return; // We have no more data to fetch
            debounceOnPageChange(pageNumber + 1);
          }
        },
      };

  const CustomPopper = (props: PopperProps) => (
    <StyledPopper
      {...props}
      placement="bottom-start"
      style={{ minWidth: popperMinWidth, width: 'auto' }}
    />
  );

  const popper = popperMinWidth ? CustomPopper : StyledPopper;

  useEffect(() => {
    setTimeout(() => setIsLoading(false), LOADER_HIDE_TIMEOUT);
  }, [options]);

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
      loadingText={loadingText ?? t('loading')}
      noOptionsText={noOptionsText ?? t('label.no-options')}
      options={options}
      size="small"
      renderInput={renderInput || defaultRenderInput}
      renderOption={renderOption || DefaultRenderOption}
      onChange={onChange}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      sx={{
        paddingTop: 0.5,
        paddingBottom: 0.5,
        width,
      }}
      slots={{
        popper: popper,
      }}
      slotProps={{
        listbox: {
          ...listboxProps,
          sx: {
            '& .MuiBox-root:nth-child(2)': {
              width: 'calc(100% - 16px)',
              overflow: 'hidden',
              '& .MuiTypography-root': {
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            },
          },
        },
      }}
    />
  );
}
