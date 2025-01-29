import React, { FC, useCallback, useEffect, useState } from 'react';
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
} from '@openmsupply-client/common';
import {
  ItemStockOnHandFragment,
  useItemById,
  useItemStockOnHandInfinite,
} from '../../api';
import { StockItemSearchInputProps } from '../../utils';
import { getItemOptionRenderer } from '../ItemOptionRenderer';

const DEBOUNCE_TIMEOUT = 300;
const ROWS_PER_PAGE = 100;

export const StockItemSearchInput: FC<StockItemSearchInputProps> = ({
  onChange,
  currentItemId,
  disabled = false,
  extraFilter,
  width,
  autoFocus = false,
  openOnFocus,
  includeNonVisibleWithStockOnHand = false,
  itemCategoryName,
}) => {
  const { filter, onFilter } = useStringFilter('codeOrName');
  const [search, setSearch] = useState('');

  const [selectedCode, setSelectedCode] = useState('');

  const debounceOnFilter = useDebouncedValueCallback(
    (searchText: string) => onFilter(searchText),
    [onFilter],
    DEBOUNCE_TIMEOUT
  );

  const fullFilter = itemCategoryName
    ? { ...filter, categoryName: itemCategoryName }
    : filter;

  const { data, isLoading, fetchNextPage, isFetchingNextPage } =
    useItemStockOnHandInfinite({
      rowsPerPage: ROWS_PER_PAGE,
      filter: fullFilter,
      includeNonVisibleWithStockOnHand,
    });
  // changed from useStockLines even though that is more appropriate
  // when viewing a stocktake, you may have a stocktake line which has no stock lines.
  // this call is to fetch the current item; if you have a large number of items
  // then the current item may not be in the available list of items due to pagination batching
  const { data: currentItem } = useItemById(currentItemId ?? undefined);

  const pageNumber = data?.pages[data?.pages.length - 1]?.pageNumber ?? 0;

  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const selectControl = useToggle();

  const filterOptions = useCallback(
    (
      options: ItemStockOnHandFragment[],
      state: FilterOptionsState<ItemStockOnHandFragment>
    ) => filterByNameAndCode(selectedCode)(options, state),
    [selectedCode]
  );

  useEffect(() => {
    if (currentItem && search === '') setSearch(getOptionLabel(currentItem));
  }, [currentItem]);

  useEffect(() => {
    // Using the Autocomplete openOnFocus prop, the popper is incorrectly
    // positioned when used within a Dialog. This is a workaround to fix the
    // popper position.
    if (openOnFocus) {
      setTimeout(() => selectControl.toggleOn(), DEBOUNCE_TIMEOUT);
    }
  }, []);

  return (
    <Autocomplete
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
        defaultOptionMapper(
          extraFilter ? items.filter(extraFilter) : items,
          'name'
        ).sort((a, b) => a.label.localeCompare(b.label))
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

function getOptionLabel(option: ItemStockOnHandFragment): string {
  return `${option.code} ${option.name}`;
}
