import React, {
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useDebouncedValueCallback,
  useStringFilter,
  useToggle,
} from '@common/hooks';
import { AutocompleteWithPagination } from './AutocompleteWithPagination';
import { AutocompleteOptionRenderer } from './types';
import { FilterOptionsState, SxProps, Theme } from '@mui/material';
import { defaultOptionMapper } from './utils';
import { CLEAR, RegexUtils } from '@common/utils';

const SEARCH_DEBOUNCE_TIMEOUT = 500;
const POPPER_REPOSITION_DELAY = 500;
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
  isFetching: boolean;
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

  // Filter
  apiFilter?: TFilter;
  // Server filter key for the search string (default `codeOrName`). Must match
  // a `{ [searchKey]: { like: string } }` field on TFilter.
  searchKey?: string;
  // For input strings like "1234 Item Name" — strip the prefix before sending
  // to the server's search filter. Defaults to identity.
  searchToFilter?: (search: string) => string;

  // Rendering
  getOptionLabel: (option: T) => string;
  // Optional secondary string to match client-side (e.g. an item code that
  // isn't part of getOptionLabel). Lets users see instant results for
  // codes during the debounce window.
  getOptionCode?: (option: T) => string | undefined;
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
  // Minimum width of the popper (dropdown). Defaults to `width`. Pass
  // explicitly when the input is fullWidth but the popper should still
  // have a usable minimum (e.g. inline pickers inside narrow table cells).
  popperMinWidth?: number;
  // DOM id for the input. Defaults to a stable generated id so multiple
  // pickers can coexist on the same page without collisions.
  id?: string;
  noOptionsText?: ReactNode;
  // sx applied to the input slot — used for the elevated-card style
  // (boxShadow + white/toolbar bg) shared by modal forms like PO line edit.
  // Pass `inputSlotProps(disabled).input.sx` from ModalInputs/utils for parity
  // with other inputs in those forms.
  textSx?: SxProps<Theme>;
}

export function InfiniteSearchPicker<T extends HasId, TFilter>({
  useInfiniteData,
  useGetById,
  value = null,
  onChange,
  currentId,
  apiFilter,
  searchKey = 'codeOrName',
  searchToFilter = s => s,
  getOptionLabel,
  getOptionCode,
  renderOption,
  getOptionDisabled,
  extraFilter,
  disabled = false,
  clearable = false,
  autoFocus = false,
  openOnFocus = false,
  width,
  popperMinWidth,
  id,
  noOptionsText,
  textSx,
}: InfiniteSearchPickerProps<T, TFilter>) {
  const selectControl = useToggle();
  const { filter, onFilter } = useStringFilter(searchKey);
  const [search, setSearch] = useState('');
  // Tracks whether the user has typed into the input. Once true, an empty
  // `search` is treated as "user cleared the field" rather than "input is
  // unedited, show the selected label" — so backspacing the field to empty
  // doesn't snap back to the previously-selected label.
  const [hasEdited, setHasEdited] = useState(false);
  const generatedId = useId();
  const inputId = id ?? `infinite-search-picker-${generatedId}`;

  const debounceOnFilter = useDebouncedValueCallback(
    (text: string) => onFilter(text),
    [onFilter],
    SEARCH_DEBOUNCE_TIMEOUT
  );

  // Cancel any pending debounced filter and reset the GraphQL filter so the
  // dropdown returns to full results. Called from every clear path (MUI's X,
  // CLEAR onInputChange, and our custom typed-but-unselected X).
  const resetFilter = () => {
    (debounceOnFilter as unknown as { cancel?: () => void }).cancel?.();
    onFilter('');
  };

  const fullFilter = useMemo(
    () => ({ ...(filter as object), ...(apiFilter as object) }) as TFilter,
    [filter, apiFilter]
  );

  const { data, isLoading, isFetching, fetchNextPage, isFetchingNextPage } =
    useInfiniteData({
      rowsPerPage: ROWS_PER_PAGE,
      filter: disabled ? undefined : fullFilter,
    });

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

  // Fall back to the resolved entity's label while the user hasn't typed
  // anything, so async currentId resolution surfaces without a state-sync effect.
  // Once the user has edited, an empty `search` means "user cleared it";
  // don't snap back to the label.
  const inputValue =
    search === '' && displayValue && !hasEdited
      ? getOptionLabel(displayValue)
      : search;

  useEffect(() => {
    // openOnFocus prop mispositions the popper inside a Dialog; toggle open
    // manually after a tick.
    const openTimer = openOnFocus
      ? setTimeout(() => selectControl.toggleOn(), POPPER_REPOSITION_DELAY)
      : undefined;
    const focusTimer = autoFocus
      ? setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>(
            `input[id="${inputId}"]`
          );
          input?.focus();
        }, 50)
      : undefined;
    return () => {
      if (openTimer) clearTimeout(openTimer);
      if (focusTimer) clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageNumber = data?.pages[data.pages.length - 1]?.pageNumber ?? 0;

  // Server filter currently in flight is `filter[searchKey].like`. While the
  // user is mid-type it hasn't caught up — client-side narrowing can flicker
  // to empty before the server responds. Hold onto the last non-empty set
  // and return it during that window so the dropdown doesn't say "no results".
  const serverFilterText =
    (filter as Record<string, { like?: string } | undefined>)[searchKey]
      ?.like ?? '';
  const fetchPending =
    serverFilterText !== searchToFilter(search) && serverFilterText !== search;
  const lastNonEmpty = useRef<T[] | null>(null);

  const filterOptions = (options: T[], state: FilterOptionsState<T>): T[] => {
    const escaped = RegexUtils.escapeChars(state.inputValue);
    const matchValue = searchToFilter(escaped);
    // Precompute regexes once per invocation rather than per option — with
    // multiple loaded pages this would otherwise allocate a RegExp for every
    // option on every keystroke.
    const escapedRe = new RegExp(escaped, 'i');
    const matchValueRe =
      matchValue === escaped ? escapedRe : new RegExp(matchValue, 'i');
    const narrowed = options.filter(option => {
      const label = getOptionLabel(option);
      const code = getOptionCode?.(option);
      const matches =
        escapedRe.test(label) ||
        matchValueRe.test(label) ||
        (!!code && escapedRe.test(code));
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
      id={inputId}
      autoFocus={autoFocus}
      disabled={disabled}
      clearable={clearable}
      value={displayValue}
      pages={data?.pages ?? []}
      pageNumber={pageNumber}
      rowsPerPage={ROWS_PER_PAGE}
      totalRows={data?.pages?.[0]?.data.totalCount ?? 0}
      loading={isLoading || isFetching || isFetchingNextPage}
      loadingInputOnly
      noOptionsText={noOptionsText}
      filterOptions={filterOptions}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      open={selectControl.isOn}
      onChange={(_, entity) => {
        setSearch(entity ? getOptionLabel(entity) : '');
        setHasEdited(false);
        // Selecting null (e.g. MUI's built-in X with a value present) also
        // resets the GraphQL filter so the dropdown shows full results on
        // the next open. Otherwise the prior `codeOrName` filter sticks.
        if (!entity) resetFilter();
        onChange(entity);
      }}
      onInputChange={(_event, _value, reason) => {
        // MUI fires both `onChange(_, null)` and `onInputChange(_, '', CLEAR)`
        // when the built-in X is clicked, so the parent `onChange` is already
        // notified above. Only reset the filter here.
        if (reason === CLEAR) resetFilter();
      }}
      inputValue={inputValue}
      clearOnBlur={false}
      onClear={() => {
        setSearch('');
        setHasEdited(false);
        resetFilter();
      }}
      inputProps={{
        onChange: e => {
          const { value: next } = e.target;
          setSearch(next);
          setHasEdited(true);
          debounceOnFilter(searchToFilter(next));
        },
        // Re-open on focus/click — `openOnFocus` on the underlying autocomplete
        // mispositions the popper inside a Dialog, so we open manually.
        // Also select-all the input text when focusing a field that's
        // showing a previously-selected value, so typing replaces it
        // instead of appending — standard searchbox UX, important for
        // clearable={false} inline pickers (manufacturer/supplier toolbars).
        //
        // The disabled guard matters here because click events on a disabled
        // TextField's outer wrapper still bubble (only the inner <input>
        // suppresses events when disabled), so without it the popper opens
        // on a disabled field.
        onFocus: e => {
          if (disabled) return;
          selectControl.toggleOn();
          if (displayValue && e.target.value === getOptionLabel(displayValue)) {
            e.target.select();
          }
        },
        onClick: () => {
          if (disabled) return;
          selectControl.toggleOn();
        },
      }}
      getOptionLabel={getOptionLabel}
      renderOption={renderOption}
      getOptionDisabled={getOptionDisabled}
      width={width ? `${width}px` : '100%'}
      popperMinWidth={popperMinWidth ?? width}
      textSx={textSx}
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
