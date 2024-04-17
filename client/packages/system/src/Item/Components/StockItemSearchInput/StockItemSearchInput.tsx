import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  useToggle,
  useFormatNumber,
  useTranslation,
  AutocompleteWithPagination as Autocomplete,
  defaultOptionMapper,
  ArrayUtils,
  useDebounceCallback,
  usePagination,
  useStringFilter,
} from '@openmsupply-client/common';
import {
  ItemStockOnHandFragment,
  useItemById,
  useItemStockOnHand,
} from '../../api';
import { itemFilterOptions, StockItemSearchInputProps } from '../../utils';
import { getItemOptionRenderer } from '../ItemOptionRenderer';

const DEBOUNCE_TIMEOUT = 300;

export const StockItemSearchInput: FC<StockItemSearchInputProps> = ({
  onChange,
  currentItemId,
  disabled = false,
  extraFilter,
  width,
  autoFocus = false,
  openOnFocus,
}) => {
  const [items, setItems] = useState<ItemStockOnHandFragment[]>([]);
  const { pagination, onPageChange } = usePagination();
  const { filter, onFilter } = useStringFilter('name');

  const { data, isLoading } = useItemStockOnHand({
    pagination,
    filter,
  });
  // changed from useStockLines even though that is more appropriate
  // when viewing a stocktake, you may have a stocktake line which has no stock lines.
  // this call is to fetch the current item; if you have a large number of items
  // then the current item may not be in the available list of items due to pagination batching
  const { data: currentItem } = useItemById(currentItemId ?? undefined);

  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const selectControl = useToggle();

  const options = useMemo(
    () =>
      defaultOptionMapper(
        extraFilter ? items.filter(extraFilter) ?? [] : items ?? [],
        'name'
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [items]
  );

  const cachedSearchedItems = useMemo(() => {
    const newItems = [...items, ...(data?.nodes ?? [])];
    if (!!currentItem) newItems.unshift(currentItem);

    return ArrayUtils.uniqBy(newItems, 'id');
  }, [data, currentItem]);

  const value =
    cachedSearchedItems.find(({ id }) => id === currentItemId) ?? null;

  const debounceOnFilter = useDebounceCallback(
    (searchText: string) => {
      onPageChange(0); // Reset pagination when searching for a new item
      onFilter(searchText);
    },
    [onFilter],
    DEBOUNCE_TIMEOUT
  );

  useEffect(() => {
    // using the Autocomplete openOnFocus prop, the popper is incorrectly positioned
    // when used within a Dialog. This is a workaround to fix the popper position.
    if (openOnFocus) {
      setTimeout(() => selectControl.toggleOn(), DEBOUNCE_TIMEOUT);
    }
  }, []);

  useEffect(() => setItems(cachedSearchedItems), [cachedSearchedItems]);

  return (
    <Autocomplete
      autoFocus={autoFocus}
      disabled={disabled}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      filterOptionConfig={itemFilterOptions}
      loading={isLoading}
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
      pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
      paginationDebounce={DEBOUNCE_TIMEOUT}
      onPageChange={onPageChange}
    />
  );
};
