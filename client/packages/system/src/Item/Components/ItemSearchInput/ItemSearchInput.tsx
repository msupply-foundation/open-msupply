import React, { FC, useEffect, useState } from 'react';
import { Item, useTranslation, styled } from '@openmsupply-client/common';
import { useItemsList } from '../../hooks/useItemsList';
import {
  Autocomplete,
  defaultOptionMapper,
} from '@openmsupply-client/common/src/ui/components/inputs/Autocomplete';

const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

const filterOptions = {
  stringify: (item: Item) => `${item.code} ${item.name}`,
  limit: 100,
};

const renderOption = (
  props: React.HTMLAttributes<HTMLLIElement>,
  item: Item
) => (
  <ItemOption {...props} key={item.code}>
    <span style={{ width: 100 }}>{item.code}</span>
    <span style={{ width: 500 }}>{item.name}</span>
    {/* <span>{item.availableQuantity}</span> */}
  </ItemOption>
);

interface ItemSearchInputProps {
  onChange: (item: Item | null) => void;
  currentItem?: Item;
  currentItemName?: string;
}

export const ItemSearchInput: FC<ItemSearchInputProps> = ({
  onChange,
  currentItem,
  currentItemName,
}) => {
  const [filter, setFilter] = useState({
    searchTerm: currentItem?.name ?? currentItemName,
    field: 'name',
  });

  const { data, isLoading, onFilterByName } = useItemsList({
    initialSortBy: { key: 'name' },
    initialFilterBy: currentItem?.code
      ? { code: { equalTo: currentItem?.code } }
      : undefined,
  });
  const t = useTranslation('common');

  useEffect(() => {
    setFilter({
      searchTerm: currentItem?.name ?? currentItemName ?? '',
      field: 'name',
    });
  }, [currentItem, currentItemName]);

  // Whenever the filter state changes, trigger a filter on the request which
  // will trigger a refetch if needed.
  useEffect(() => {
    onFilterByName(filter.searchTerm ?? '');

    if (filter.field === 'name') {
      const foundItem = data?.nodes?.find(i => i.name === currentItemName);
      if (foundItem?.name === filter.searchTerm) return;
    }
  }, [filter]);

  const value =
    currentItem ??
    (currentItemName
      ? data?.nodes?.find(i => i.name === currentItemName) || null
      : null);

  return (
    <Autocomplete
      filterOptionConfig={filterOptions}
      loading={isLoading}
      value={value ? { ...value, label: value.name ?? '' } : null}
      noOptionsText={t('error.no-items')}
      onInputChange={(_, value) => {
        if (!value) return;
        setFilter({ searchTerm: value, field: 'name' });
      }}
      onChange={(_, item) => {
        onChange(item);
      }}
      options={defaultOptionMapper(data?.nodes ?? [], 'name')}
      renderOption={renderOption}
      width="100%"
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
