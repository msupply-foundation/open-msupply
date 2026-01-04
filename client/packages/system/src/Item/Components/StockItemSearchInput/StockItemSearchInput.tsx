import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  useToggle,
  useFormatNumber,
  useTranslation,
  AutocompleteWithPagination as Autocomplete,
  defaultOptionMapper,
  useStringFilter,
  useDebouncedValueCallback,
  FilterOptionsState,
  RegexUtils,
  ItemFilterInput,
} from '@openmsupply-client/common';
import {
  ItemStockOnHandFragment,
  useGetById,
  useItemStockOnHandInfinite,
} from '../../api';
import { getOptionLabel, StockItemSearchInputProps } from '../../utils';
import { getItemOptionRenderer } from '../ItemOptionRenderer';

const DEBOUNCE_TIMEOUT = 300;
const ROWS_PER_PAGE = 100;

export const StockItemSearchInput = ({
  onChange,
  currentItemId,
  disabled = false,
  width,
  autoFocus = false,
  openOnFocus,
  filter: apiFilter,
  itemCategoryName,
  programId,
  initialUpdate = false,
}: StockItemSearchInputProps) => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const selectControl = useToggle();

  const { filter, onFilter } = useStringFilter('codeOrName');

  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState('');

  const debounceOnFilter = useDebouncedValueCallback(
    (searchText: string) => onFilter(searchText),
    [onFilter],
    DEBOUNCE_TIMEOUT
  );

  const fullFilter: ItemFilterInput = useMemo(() => {
    const result: ItemFilterInput = { ...filter, ...apiFilter };
    if (itemCategoryName) result['categoryName'] = itemCategoryName;
    // For now, we are filtering items by "master_list", as they have the same ID
    // as their equivalent program. In the future, this may change, so we can add
    // another filter specifically for programs if required.
    if (programId) result['masterListId'] = { equalTo: programId };
    return result;
  }, [filter, apiFilter, itemCategoryName, programId]);

  const { data, isLoading, fetchNextPage, isFetchingNextPage } =
    useItemStockOnHandInfinite({
      rowsPerPage: ROWS_PER_PAGE,
      filter: disabled ? undefined : fullFilter,
    });

  // Try to find current item in the infinite query cache first (optimization)
  const currentItemFromCache = useMemo(() => {
    if (!currentItemId) return null;
    const allItems = data?.pages.flatMap(page => page.data.nodes) ?? [];
    return allItems.find(item => item.id === currentItemId) ?? null;
  }, [currentItemId, data?.pages]);

  // Fallback: fetch current item separately if not in cache
  // This is important because the infinite query may have filters that exclude the current item
  // (e.g., when editing a stocktake line, the item is excluded from the search results)
  const { data: currentItemFromAPI } = useGetById(
    currentItemId && !currentItemFromCache ? currentItemId : ''
  );

  // Use cached item if available, otherwise use API result
  const currentItem = currentItemFromCache ?? currentItemFromAPI ?? null;

  const pageNumber = data?.pages[data?.pages.length - 1]?.pageNumber ?? 0;

  const filterOptions = useCallback(
    (
      options: ItemStockOnHandFragment[],
      state: FilterOptionsState<ItemStockOnHandFragment>
    ) => filterByNameAndCode(selectedCode)(options, state),
    [selectedCode]
  );

  useEffect(() => {
    if (initialUpdate && currentItem) {
      // If initialUpdate is true, we call onChange with the current item
      // when the component mounts, so that the parent component can update
      // its state with the current item.
      onChange(currentItem);
    }
    if (currentItem && search === '') setSearch(getOptionLabel(currentItem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem, search]);

  useEffect(() => {
    // Using the Autocomplete openOnFocus prop, the popper is incorrectly
    // positioned when used within a Dialog. This is a workaround to fix the
    // popper position.
    if (openOnFocus) {
      setTimeout(() => selectControl.toggleOn(), DEBOUNCE_TIMEOUT);
    }

    // Force focus after component mounts (this can conflict with openOnFocus)
    if (autoFocus) {
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(
          'input[id="stock-item-search-input"]'
        );
        input?.focus();
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Autocomplete
      id="stock-item-search-input"
      pages={data?.pages ?? []}
      pageNumber={pageNumber}
      rowsPerPage={ROWS_PER_PAGE}
      totalRows={data?.pages?.[0]?.data.totalCount ?? 0}
      autoFocus={autoFocus}
      disabled={disabled}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      loading={isLoading || isFetchingNextPage}
      value={
        currentItem ? { ...currentItem, label: currentItem.name ?? '' } : null
      }
      noOptionsText={t('error.no-items')}
      filterOptions={filterOptions}
      onChange={(_, item) => {
        // Set the search value when selecting/clearing an option
        setSearch(item ? getOptionLabel(item) : '');
        setSelectedCode(item?.code ?? '');
        onChange(item);
      }}
      getOptionLabel={getOptionLabel}
      renderOption={getItemOptionRenderer(
        t('label.units'),
        formatNumber.format
      )}
      width={width ? `${width}px` : '100%'}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      open={selectControl.isOn}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      onPageChange={pageNumber => fetchNextPage({ pageParam: pageNumber })}
      mapOptions={items =>
        defaultOptionMapper(items, 'name').sort((a, b) =>
          a.label.localeCompare(b.label)
        )
      }
      inputValue={search}
      inputProps={{
        onChange: e => {
          const { value } = e.target;
          setSearch(value);
          debounceOnFilter(getItemNameFilterValue(value, selectedCode));
        },
        onBlur: () => setSearch(currentItem ? getOptionLabel(currentItem) : ''),
      }}
    />
  );
};

// After an item is selected, input string is `item_code item_name` e.g. `1234 Item Name`.
// However, backend search filter only supports name OR code, not both in the same string.
// So, when backspacing, the code should be removed to filter by name only
// e.g. even though string shows `1234 Ite`, backend search string is `Ite`
// Until only code value remains, then search by that
function getItemNameFilterValue(search: string, selectedCode: string): string {
  return selectedCode ? search.replace(`${selectedCode} `, '') : search;
}

function filterByNameAndCode(selectedCode: string) {
  return (
    options: ItemStockOnHandFragment[],
    state: FilterOptionsState<ItemStockOnHandFragment>
  ) =>
    options.filter(option => {
      const searchValue = RegexUtils.escapeChars(state.inputValue);
      return (
        RegexUtils.includes(searchValue, option.code) ||
        RegexUtils.includes(
          getItemNameFilterValue(searchValue, selectedCode),
          option.name
        )
      );
    });
}
