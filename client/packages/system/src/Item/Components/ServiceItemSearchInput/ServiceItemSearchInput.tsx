import React from 'react';
import {
  useToggle,
  useTranslation,
  Autocomplete,
  defaultOptionMapper,
  styled,
  QueryParamsProvider,
  createQueryParamsStore,
  ItemNodeType,
} from '@openmsupply-client/common';
import { ItemRowFragment, useItemsByFilter } from '../../api';

interface ItemSearchInputProps {
  onChange: (item: ItemRowFragment | null) => void;
  currentItemId?: string | null;
  disabled?: boolean;
  width?: number;
  autoFocus?: boolean;
  refetchOnMount?: boolean;
}

const filterOptions = {
  stringify: (item: ItemRowFragment) => `${item.code} ${item.name}`,
  limit: 100,
};

const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

export const optionRenderer = (
  props: React.HTMLAttributes<HTMLLIElement>,
  item: ItemRowFragment
) => (
  <ItemOption {...props} key={item.code}>
    <span style={{ whiteSpace: 'nowrap', width: 500 }}>{item.name}</span>
  </ItemOption>
);

const ServiceItemSearchComponent = ({
  onChange,
  currentItemId,
  disabled = false,
  width = 200,
  autoFocus = false,
  refetchOnMount = true,
}: ItemSearchInputProps) => {
  const { data, isLoading } = useItemsByFilter({
    refetchOnMount,
    filterBy: {
      type: { equalTo: ItemNodeType.Service },
    },
  });
  const t = useTranslation();
  const selectControl = useToggle();

  const value =
    data?.nodes.find(({ id }) => id === currentItemId) ?? data?.nodes[0];

  return (
    <Autocomplete
      clearable={false}
      autoFocus={autoFocus}
      disabled={disabled}
      onOpen={selectControl.toggleOn}
      onClose={selectControl.toggleOff}
      filterOptionConfig={filterOptions}
      loading={isLoading}
      value={value ? { ...value, label: value.name ?? '' } : null}
      noOptionsText={t('error.no-items')}
      onChange={(_, item) => onChange(item)}
      options={defaultOptionMapper(data?.nodes ?? [], 'name')}
      getOptionLabel={option => `${option.name}`}
      renderOption={optionRenderer}
      width={`${width}px`}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};

export const ServiceItemSearchInput = (props: ItemSearchInputProps) => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<ItemRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <ServiceItemSearchComponent {...props} />
  </QueryParamsProvider>
);
