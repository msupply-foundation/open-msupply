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
  CircularProgress,
  Box,
  IconButton,
} from '@mui/material';
import { BasicTextInput } from '../TextInput';
import { useDebounceCallback } from '@common/hooks';
import type { AutocompleteProps } from './Autocomplete';
import { StyledPopper } from './components';
import { ArrayUtils } from '@common/utils';
import { RecordWithId } from '@common/types';
import { useOpenStateWithKeyboard } from '@common/components';
import { useTranslation } from '@common/intl';
import { CloseIcon } from '@common/icons';

const LOADER_HIDE_TIMEOUT = 500;

export interface AutocompleteWithPaginationProps<
  T extends RecordWithId,
> extends Omit<AutocompleteProps<T>, 'options'> {
  pageNumber: number;
  rowsPerPage: number;
  totalRows: number;
  paginationDebounce?: number;
  pages: { data: { nodes: T[] } }[];
  onPageChange?: (page: number) => void;
  mapOptions?: (items: T[]) => (T & { label: string })[];
  // Called when the user clears typed text via the X button shown while
  // they have typed input but no option is selected. MUI's built-in clear
  // only renders when `value` is non-null, so the wrapper provides this
  // path for the "typed but unselected" state.
  onClear?: () => void;
  // When true, the spinner shows in the input adornment but the listbox
  // keeps rendering existing options instead of swapping to "Loading...".
  // Useful for debounced server-side filtering where the previous results
  // are still a useful preview while a refetch is in flight.
  loadingInputOnly?: boolean;
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
  onClear,
  mapOptions,
  loadingInputOnly = false,
  sx,
  textSx,
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
    const flat = ArrayUtils.flatMap(pages, page => page.data?.nodes ?? []);
    const seen = new Set<string>();
    // De-dup across pages, which can happen apparently
    const records = flat.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

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
      // Outer MuiAutocomplete `sx={{ width }}` alone doesn't survive inside a
      // shrinking flex parent (e.g. PO line edit) — without an inner minWidth
      // the TextField collapses to content size.
      sx={{ minWidth: width }}
      slotProps={{
        input: {
          ...props.InputProps,
          disableUnderline: false,
          sx: {
            paddingY: '4px !important',
            ...textSx,
          },
          endAdornment: (
            <>
              {isLoading || loading ? (
                <CircularProgress color="primary" size={18} />
              ) : null}
              {clearable && onClear && !!inputValue && value == null ? (
                <IconButton
                  size="small"
                  aria-label={t('button.clear-results')}
                  onMouseDown={e => e.preventDefault()}
                  onClick={onClear}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
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
      loading={loadingInputOnly ? false : loading}
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
        ...sx,
      }}
      slots={{
        popper: StyledPopper,
      }}
      slotProps={{
        popper: popperMinWidth
          ? {
              placement: 'bottom-start' as const,
              style: { minWidth: popperMinWidth, width: 'auto' },
            }
          : undefined,
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
