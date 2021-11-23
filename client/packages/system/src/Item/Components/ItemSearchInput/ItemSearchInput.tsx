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
  disabled?: boolean;
}

export const ItemSearchInput: FC<ItemSearchInputProps> = ({
  onChange,
  currentItem,
  disabled = false,
}) => {
  const [filter, setFilter] = useState<{
    searchTerm: string;
    field: string;
  } | null>(null);

  const { data, isLoading, onFilterByName } = useItemsList({
    initialSortBy: { key: 'name' },
  });
  const t = useTranslation('common');

  useEffect(() => {
    if (!filter) return;
    onFilterByName(filter.searchTerm ?? '');
  }, [filter]);

  const value = currentItem ?? null;
  const [open, setOpen] = useState(false);
  const [buffer, setBuffer] = React.useState(value);

  useEffect(() => {
    if (value && buffer && open) {
      setBuffer(null);
      setFilter({
        searchTerm: '',
        field: 'name',
      });
    } else if (!open) {
      setBuffer(value);
    }
  }, [open, value, buffer]);

  return (
    <Autocomplete
      disabled={disabled}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => {
        setOpen(false);
      }}
      filterOptionConfig={filterOptions}
      loading={isLoading}
      value={buffer ? { ...buffer, label: buffer.name ?? '' } : null}
      noOptionsText={t('error.no-items')}
      onInputChange={(_, value, reason) => {
        if (reason === 'input') {
          setFilter({ searchTerm: value, field: 'name' });
        }
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
