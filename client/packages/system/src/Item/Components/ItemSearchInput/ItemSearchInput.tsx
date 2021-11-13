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
    <span>{item.availableQuantity}</span>
  </ItemOption>
);

interface ItemSearchInputProps {
  onChange: (item: Item | null) => void;
  currentItem?: Item;
  currentItemCode?: string;
}

export const ItemSearchInput: FC<ItemSearchInputProps> = ({
  onChange,
  currentItem,
  currentItemCode,
}) => {
  const [filter, setFilter] = useState({
    searchTerm: currentItem?.code ?? currentItemCode ?? '',
    field: 'code',
  });

  const { data, isLoading, onFilterByName, onFilterByCode } = useItemsList({
    initialSortBy: { key: 'name' },
    initialFilterBy: currentItem?.code
      ? { code: { equalTo: currentItem?.code } }
      : undefined,
  });
  const t = useTranslation();

  useEffect(() => {
    setFilter({
      searchTerm: currentItem?.code ?? currentItemCode ?? '',
      field: 'code',
    });
  }, [currentItem, currentItemCode]);

  useEffect(() => {
    if (filter.field === 'name') return onFilterByName(filter.searchTerm);
    if (filter.field === 'code') return onFilterByCode(filter.searchTerm);
  }, [filter]);

  const value =
    currentItem ??
    (currentItemCode
      ? data?.nodes?.find(i => i.code === currentItemCode) || null
      : null);

  return (
    <Autocomplete
      filterOptionConfig={filterOptions}
      loading={isLoading}
      value={value ? { ...value, label: value.name ?? '' } : null}
      noOptionsText={t('error.no-items')}
      onInputChange={(_, value) => {
        setFilter({ searchTerm: value, field: 'name' });
      }}
      onChange={(_, item) => {
        onChange(item);
      }}
      options={defaultOptionMapper(data?.nodes ?? [], 'name')}
      renderOption={renderOption}
      // defaultValue={value ? { ...value, label: value.code } : undefined}
      width="100%"
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
