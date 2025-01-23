import React, { FC, useEffect } from 'react';
import {
  useToggle,
  useFormatNumber,
  useTranslation,
  AutocompleteWithPagination as Autocomplete,
  defaultOptionMapper,
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
      pages={data?.pages ?? []}
      pageNumber={pageNumber}
      rowsPerPage={ROWS_PER_PAGE}
      totalRows={data?.pages?.[0]?.data.totalCount ?? 0}
      autoFocus={autoFocus}
      disabled={disabled}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      filterOptionConfig={itemFilterOptions}
      loading={isLoading || isFetchingNextPage}
      value={
        currentItem ? { ...currentItem, label: currentItem.name ?? '' } : null
      }
      noOptionsText={t('error.no-items')}
      onChange={(_, item) => onChange(item)}
      getOptionLabel={option => `${option.code}     ${option.name}`}
      renderOption={getItemOptionRenderer(
        t('label.units'),
        formatNumber.format
      )}
      width={width ? `${width}px` : '100%'}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
      // open={selectControl.isOn}
      open={true}
      onInputChange={(_, value) => debounceOnFilter(value)}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      onPageChange={pageNumber => fetchNextPage({ pageParam: pageNumber })}
      mapOptions={items =>
        defaultOptionMapper(
          extraFilter ? items.filter(extraFilter) : items,
          'name'
        ).sort((a, b) => a.label.localeCompare(b.label))
      }
    />
  );
};
