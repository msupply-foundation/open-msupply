import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  useDebouncedValueCallback,
  useStringFilter,
  useToggle,
} from '@common/hooks';
import { AutocompleteWithPagination } from './AutocompleteWithPagination';
import { AutocompleteOptionRenderer } from './types';
import { FilterOptionsState } from '@mui/material';
import { defaultOptionMapper } from './utils';
import { CLEAR, RegexUtils } from '@common/utils';

const SEARCH_DEBOUNCE_TIMEOUT = 500;
const PAGINATION_DEBOUNCE_TIMEOUT = 100;
const ROWS_PER_PAGE = 100;

interface HasId {
  id: string;
}

interface InfiniteQueryPage<T> {
  data: { nodes: T[]; totalCount: number };
  pageNumber: number;
}

interface InfiniteQueryResult<T> {
  data?: { pages: InfiniteQueryPage<T>[] };
  isLoading: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: (opts: { pageParam: number }) => unknown;
}

export interface InfiniteSearchPickerProps<T extends HasId, TFilter> {
  // Data — caller-supplied hooks
  useInfiniteData: (params: {
    rowsPerPage: number;
    filter?: TFilter;
  }) => InfiniteQueryResult<T>;
  useGetById: (id: string) => { data?: T | null };

  // Selection — either control `value` or pass `currentId` to have the picker
  // resolve the entity itself (cache → byId fallback).
  value?: T | null;
  onChange: (entity: T | null) => void;
  currentId?: string;
  // Fire `onChange` once after `currentId` resolves to an entity. Useful for
  // parents that pass an id but don't have the full entity loaded yet.
  notifyOnLoad?: boolean;

  // Filter
  apiFilter?: TFilter;
  // For input strings like "1234 Item Name" — strip the prefix before sending
  // to the server's codeOrName filter. Defaults to identity.
  searchToFilter?: (search: string) => string;

  // Rendering
  getOptionLabel: (option: T) => string;
  renderOption?: AutocompleteOptionRenderer<T>;
  getOptionDisabled?: (option: T) => boolean;
  // Client-side post-filter applied to each loaded page (e.g. exclude on-hold)
  extraFilter?: (option: T) => boolean;

  // UX
  disabled?: boolean;
  clearable?: boolean;
  autoFocus?: boolean;
  openOnFocus?: boolean;
  width?: number;
  id?: string;
  noOptionsText?: ReactNode;

  // Called when the visual search string changes (e.g. after the user selects
  // an item, parent can react to the displayed text). Optional.
  onSearchChange?: (search: string) => void;
  // Fires when the picker's displayed entity changes — either because the
  // user picked something or because `currentId` resolved to a new entity.
  // Useful for parents that need to track selection-derived state.
  onDisplayValueChange?: (entity: T | null) => void;
}

export function InfiniteSearchPicker<T extends HasId, TFilter>({
  useInfiniteData,
  useGetById,
  value = null,
  onChange,
  currentId,
  notifyOnLoad = false,
  apiFilter,
  searchToFilter = s => s,
  getOptionLabel,
  renderOption,
  getOptionDisabled,
  extraFilter,
  disabled = false,
  clearable = false,
  autoFocus = false,
  openOnFocus = false,
  width,
  id,
  noOptionsText,
  onSearchChange,
  onDisplayValueChange,
}: InfiniteSearchPickerProps<T, TFilter>) {
  const selectControl = useToggle();
  const { filter, onFilter } = useStringFilter('codeOrName');
  const [search, setSearch] = useState('');

  const updateSearch = (next: string) => {
    setSearch(next);
    onSearchChange?.(next);
  };

  const debounceOnFilter = useDebouncedValueCallback(
    (text: string) => onFilter(text),
    [onFilter],
    SEARCH_DEBOUNCE_TIMEOUT
  );

  const fullFilter = useMemo(
    () => ({ ...(filter as object), ...(apiFilter as object) }) as TFilter,
    [filter, apiFilter]
  );

  const { data, isLoading, fetchNextPage, isFetchingNextPage } = useInfiniteData(
    {
      rowsPerPage: ROWS_PER_PAGE,
      filter: disabled ? undefined : fullFilter,
    }
  );

  // Cache-first lookup for currentId, falling back to a byId fetch if it isn't
  // on any loaded page (e.g. past the first page, or excluded by the filter).
  const fromCache = useMemo(() => {
    if (!currentId) return null;
    const all = data?.pages.flatMap(page => page.data.nodes) ?? [];
    return all.find(item => item.id === currentId) ?? null;
  }, [currentId, data?.pages]);

  const { data: fromApi } = useGetById(
    currentId && !fromCache ? currentId : ''
  );

  const currentEntity = fromCache ?? fromApi ?? null;
  // Render the controlled value if given, otherwise fall back to the entity
  // resolved from currentId. The parent isn't notified on the fallback — the
  // picker just displays the resolved entity.
  const displayValue = value ?? currentEntity;

  // Keep the displayed search string in sync with the resolved entity, and
  // surface the resolved entity via onDisplayValueChange so the parent can
  // track selection-derived state (e.g. items' selectedCode).
  useEffect(() => {
    if (displayValue && search === '') updateSearch(getOptionLabel(displayValue));
    onDisplayValueChange?.(displayValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayValue]);

  // Optionally notify the parent on first load (some consumers pass
  // `currentId` without having the full entity yet — they need to be told
  // what was resolved so they can populate their own state).
  useEffect(() => {
    if (notifyOnLoad && currentEntity && !value) onChange(currentEntity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEntity]);

  useEffect(() => {
    if (openOnFocus) {
      // openOnFocus prop mispositions the popper inside a Dialog; toggle open
      // manually after a tick.
      setTimeout(() => selectControl.toggleOn(), SEARCH_DEBOUNCE_TIMEOUT);
    }
    if (autoFocus && id) {
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(
          `input[id="${id}"]`
        );
        input?.focus();
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageNumber = data?.pages[data.pages.length - 1]?.pageNumber ?? 0;

  // Server filter currently in flight is `filter.codeOrName.like`. While the
  // user is mid-type it hasn't caught up — client-side narrowing can flicker
  // to empty before the server responds. Hold onto the last non-empty set
  // and return it during that window so the dropdown doesn't say "no results".
  const serverFilterText =
    (filter as { codeOrName?: { like?: string } })?.codeOrName?.like ?? '';
  const fetchPending =
    serverFilterText !== searchToFilter(search) && serverFilterText !== search;
  const lastNonEmpty = useRef<T[] | null>(null);

  const filterOptions = (
    options: T[],
    state: FilterOptionsState<T>
  ): T[] => {
    const escaped = RegexUtils.escapeChars(state.inputValue);
    const matchValue = searchToFilter(escaped);
    const narrowed = options.filter(option => {
      const label = getOptionLabel(option);
      const code = (option as { code?: string }).code ?? '';
      const matches =
        RegexUtils.includes(escaped, label) ||
        RegexUtils.includes(matchValue, label) ||
        (!!code && RegexUtils.includes(escaped, code));
      return matches && (!extraFilter || extraFilter(option));
    });
    if (narrowed.length > 0) {
      lastNonEmpty.current = narrowed;
      return narrowed;
    }
    if (!fetchPending) {
      // Server has caught up and agrees there are no results — clear the
      // stash so the next keystroke doesn't flash an outdated list.
      lastNonEmpty.current = null;
      return narrowed;
    }
    return lastNonEmpty.current ?? narrowed;
  };

  return (
    <AutocompleteWithPagination<T>
      id={id}
      autoFocus={autoFocus}
      disabled={disabled}
      clearable={clearable}
      value={displayValue}
      pages={data?.pages ?? []}
      pageNumber={pageNumber}
      rowsPerPage={ROWS_PER_PAGE}
      totalRows={data?.pages?.[0]?.data.totalCount ?? 0}
      loading={isLoading || isFetchingNextPage}
      noOptionsText={noOptionsText}
      filterOptions={filterOptions}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      open={selectControl.isOn}
      onChange={(_, entity) => {
        updateSearch(entity ? getOptionLabel(entity) : '');
        onChange(entity);
      }}
      onInputChange={(_event, _value, reason) => {
        if (reason === CLEAR) onChange(null);
      }}
      inputValue={search}
      clearOnBlur={false}
      onClear={() => {
        updateSearch('');
        onFilter('');
      }}
      inputProps={{
        onChange: e => {
          const { value: next } = e.target;
          updateSearch(next);
          debounceOnFilter(searchToFilter(next));
        },
      }}
      getOptionLabel={getOptionLabel}
      renderOption={renderOption}
      getOptionDisabled={getOptionDisabled}
      width={width ? `${width}px` : '100%'}
      popperMinWidth={width}
      isOptionEqualToValue={(option, val) => option?.id === val?.id}
      paginationDebounce={PAGINATION_DEBOUNCE_TIMEOUT}
      onPageChange={page => fetchNextPage({ pageParam: page })}
      mapOptions={items =>
        defaultOptionMapper(
          items.map(i => ({ ...i, label: getOptionLabel(i) })),
          'label'
        ).sort((a, b) => a.label.localeCompare(b.label))
      }
    />
  );
}
