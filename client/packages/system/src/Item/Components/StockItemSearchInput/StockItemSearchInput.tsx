import React, { FC, useEffect, useMemo } from 'react';
import {
  useToggle,
  useFormatNumber,
  useTranslation,
  AutocompleteWithPagination as Autocomplete,
  defaultOptionMapper,
  ArrayUtils,
  useDebounceCallback,
  useStringFilter,
} from '@openmsupply-client/common';
import { useItemById, useItemStockOnHandInfinite } from '../../api';
import { itemFilterOptions, StockItemSearchInputProps } from '../../utils';
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
  const { filter, onFilter } = useStringFilter('name');

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

  const options = useMemo(() => {
    const items = ArrayUtils.flatMap(
      data?.pages,
      page => page.data?.nodes ?? []
    );

    if (!!currentItem && !items.some(i => i.id === currentItemId)) {
      items.unshift(currentItem);
    }

    return defaultOptionMapper(
      extraFilter ? (items.filter(extraFilter) ?? []) : (items ?? []),
      'name'
    ).sort((a, b) => a.label.localeCompare(b.label));
  }, [data?.pages]);

  const value = options.find(({ id }) => id === currentItemId) ?? null;

  const debounceOnFilter = useDebounceCallback(
    (searchText: string) => onFilter(searchText),
    [onFilter],
    DEBOUNCE_TIMEOUT
  );

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
      autoFocus={autoFocus}
      disabled={disabled}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      filterOptionConfig={itemFilterOptions}
      loading={isLoading || isFetchingNextPage}
      value={value ? { ...value, label: value.name ?? '' } : null}
      noOptionsText={t('error.no-items')}
      onChange={(_, item) => onChange(item)}
      options={options}
      getOptionLabel={option => `${option.code}     ${option.name}`}
      renderOption={getItemOptionRenderer(
        t('label.units'),
        formatNumber.format
      )}
      width={width ? `${width}px` : '100%'}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      open={selectControl.isOn}
      onInputChange={(_, value) => debounceOnFilter(value)}
      // Pagination data helps Autocomplete scroll know where in the list we're up to
      pagination={{
        first: ROWS_PER_PAGE,
        page: pageNumber,
        offset: pageNumber * ROWS_PER_PAGE,
        total: data?.pages?.[0]?.data.totalCount ?? 0,
      }}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      onPageChange={pageNumber => fetchNextPage({ pageParam: pageNumber })}
    />
  );
};
