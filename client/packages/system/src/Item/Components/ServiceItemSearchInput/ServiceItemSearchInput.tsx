import React, { FC } from 'react';
import {
  useToggle,
  useTranslation,
  Autocomplete,
  defaultOptionMapper,
  styled,
} from '@openmsupply-client/common';
import { useServiceItems } from '../../api';
import { ServiceItemRowFragment } from '../../api/operations.generated';

interface ItemSearchInputProps {
  onChange: (item: ServiceItemRowFragment | null) => void;
  currentItemId?: string | null;
  disabled?: boolean;
  extraFilter?: (item: ServiceItemRowFragment) => boolean;
  width?: number;
  autoFocus?: boolean;
}

const filterOptions = {
  stringify: (item: ServiceItemRowFragment) => `${item.code} ${item.name}`,
  limit: 100,
};

const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

export const optionRenderer = (
  props: React.HTMLAttributes<HTMLLIElement>,
  item: ServiceItemRowFragment
) => (
  <ItemOption {...props} key={item.code}>
    <span style={{ whiteSpace: 'nowrap', width: 500 }}>{item.name}</span>
  </ItemOption>
);

export const ServiceItemSearchInput: FC<ItemSearchInputProps> = ({
  onChange,
  currentItemId,
  disabled = false,
  width = 850,
  autoFocus = false,
}) => {
  const { data, isLoading } = useServiceItems();
  const t = useTranslation('common');
  const selectControl = useToggle();

  const value =
    data?.nodes.find(({ id }) => id === currentItemId) ?? data?.nodes[0];

  return (
    <Autocomplete
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
