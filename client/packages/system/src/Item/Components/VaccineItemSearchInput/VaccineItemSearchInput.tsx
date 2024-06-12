import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  useToggle,
  useTranslation,
  AutocompleteWithPagination as Autocomplete,
  defaultOptionMapper,
  ArrayUtils,
  useDebounceCallback,
  usePagination,
  useStringFilter,
  Tooltip,
} from '@openmsupply-client/common';
import { ItemRowFragment, useItemById } from '../../api';
import { ItemOption } from '../../utils';
import { useVaccineItems } from 'packages/system/src/IndicatorsDemographics/api/hooks/document/useVaccineItems';

const DEBOUNCE_TIMEOUT = 300;

interface VaccineItemSearchInputProps {
  onChange: (item: ItemRowFragment | null) => void;
  extraFilter?: (item: ItemRowFragment) => boolean;
  currentItemId?: string | null;
  disabled?: boolean;
  width?: number;
  autoFocus?: boolean;
  openOnFocus?: boolean;
}

const getItemOptionRenderer = (
  props: React.HTMLAttributes<HTMLLIElement>,
  item: ItemRowFragment
) => (
  <Tooltip title={`${item.code} ${item.name}`} key={item.id}>
    <ItemOption {...props} key={item.code}>
      <span
        style={{
          whiteSpace: 'nowrap',
          width: 150,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.code}
      </span>
      <span style={{ whiteSpace: 'normal', width: 500 }}>{item.name}</span>
    </ItemOption>
  </Tooltip>
);

const itemFilterOptions = {
  stringify: (item: ItemRowFragment) => `${item.code} ${item.name}`,
};

export const VaccineItemSearchInput: FC<VaccineItemSearchInputProps> = ({
  onChange,
  currentItemId,
  disabled = false,
  extraFilter,
  width,
  autoFocus = false,
  openOnFocus,
}) => {
  const [items, setItems] = useState<ItemRowFragment[]>([]);
  const { pagination, onPageChange } = usePagination();
  const { filter, onFilter } = useStringFilter('name');

  const { data, isLoading } = useVaccineItems({
    pagination,
    filter,
  });

  const { data: currentItem } = useItemById(currentItemId ?? undefined);

  const t = useTranslation();
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
      value={value ? { ...value, label: value.unitName ?? '' } : null}
      noOptionsText={t('error.no-items')}
      onChange={(_, item) => onChange(item)}
      options={options}
      getOptionLabel={option => `${option.code}     ${option.name}`}
      renderOption={getItemOptionRenderer}
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
