import React, { FC } from 'react';
import { Item, useTranslation, styled } from '@openmsupply-client/common';
import { useItems } from '../../hooks/useItems/useItems';
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
  onChange: (item: Item) => void;
  currentItem?: Item;
  currentItemId?: string;
}

export const ItemSearchInput: FC<ItemSearchInputProps> = ({
  onChange,
  currentItem,
  currentItemId,
}) => {
  const { data, isLoading } = useItems();
  const t = useTranslation();

  const value =
    currentItem ??
    (currentItemId
      ? data?.nodes?.find(i => i.id === currentItemId)
      : undefined);

  return (
    <Autocomplete
      filterOptionConfig={filterOptions}
      loading={isLoading}
      noOptionsText={t('error.no-items')}
      onChange={(_, item) => {
        item && onChange(item);
      }}
      options={defaultOptionMapper(data?.nodes ?? [], 'name')}
      renderOption={renderOption}
      value={
        value && {
          ...value,
          label: value.name,
        }
      }
      width="100%"
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};
