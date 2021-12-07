import React, { FC, useEffect, useState } from 'react';
import {
  Item,
  useFormatNumber,
  useTranslation,
  styled,
} from '@openmsupply-client/common';
import { useItemsList } from '../../hooks/useItemsList';
import { Autocomplete, defaultOptionMapper } from '@openmsupply-client/common';

const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

const filterOptions = {
  stringify: (item: Item) => `${item.code} ${item.name}`,
  limit: 100,
};

const getOptionRenderer =
  (label: string, formatNumber: (value: number) => string) =>
  (props: React.HTMLAttributes<HTMLLIElement>, item: Item) =>
    (
      <ItemOption {...props} key={item.code}>
        <span style={{ whiteSpace: 'nowrap', width: 100 }}>{item.code}</span>
        <span style={{ whiteSpace: 'nowrap', width: 500 }}>{item.name}</span>
        <span
          style={{
            width: 200,
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >{`${formatNumber(item.availableQuantity)} ${label}`}</span>
      </ItemOption>
    );

interface ItemSearchInputProps {
  onChange: (item: Item | null) => void;
  currentItem?: Item;
  currentItemName?: string;
  disabled?: boolean;
  extraFilter?: (item: Item) => boolean;
}

export const ItemSearchInput: FC<ItemSearchInputProps> = ({
  onChange,
  currentItem,
  disabled = false,
  extraFilter,
}) => {
  const [filter, setFilter] = useState<{
    searchTerm: string;
    field: string;
  } | null>(null);

  const { data, isLoading, onFilterByName } = useItemsList({
    initialSortBy: { key: 'name' },
  });
  const t = useTranslation('common');
  const formatNumber = useFormatNumber();

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

  const options = extraFilter
    ? data?.nodes?.filter(extraFilter) ?? []
    : data?.nodes ?? [];

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
      options={defaultOptionMapper(options, 'name')}
      renderOption={getOptionRenderer(t('label.units'), formatNumber)}
      width="100%"
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
