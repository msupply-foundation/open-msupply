import React, { SyntheticEvent } from 'react';

import {
  Divider,
  Grid,
  Item,
  ModalInputRow,
  ModalLabel,
  ModalRow,
  useFormContext,
  gql,
  request,
  styled,
  useQuery,
  useTranslation,
  Autocomplete,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
interface ItemDetailsProps {
  item?: Item;
  onSubmit: () => void;
}

const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.midGrey,
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

export const ItemDetails: React.FC<ItemDetailsProps> = ({ item, onSubmit }) => {
  const { register, setValue, trigger } = useFormContext();
  const listQueryFn = async (): Promise<Item[]> => {
    const { items } = await request(
      Environment.API_URL,
      gql`
        query Query {
          items {
            data {
              id
              name
              code
              availableQuantity
            }
          }
        }
      `
    );

    return items.data;
  };

  const t = useTranslation();
  const { data, isLoading } = useQuery(['item', 'list'], listQueryFn);
  const options = data?.map(item => ({ label: item.name, ...item })) || [];

  const selectItem = (
    _event: SyntheticEvent<Element, Event>,
    value: Item | null
  ) => {
    setValue('id', value?.id || '');
    setValue('code', value?.code || '');
    setValue('name', value?.name || '');
    trigger('id');
  };

  register('id', { required: true });
  return (
    <form onSubmit={onSubmit}>
      <Grid container gap={0.5}>
        <ModalInputRow
          inputProps={register('code', { disabled: true })}
          labelKey="label.code"
          defaultValue={item?.code}
        />
        <ModalRow>
          <ModalLabel labelKey="label.item" />
          <Autocomplete
            filterOptionConfig={filterOptions}
            loading={isLoading}
            noOptionsText={t('error.no-items')}
            onChange={selectItem}
            options={options}
            renderOption={renderOption}
            width={540}
          />
        </ModalRow>
        <ModalInputRow
          inputProps={register('quantity', {
            required: true,
            min: { value: 1, message: t('error.greater-than-zero-required') },
            pattern: { value: /^[0-9]+$/, message: t('error.number-required') },
          })}
          labelKey="label.quantity"
          defaultValue={item?.availableQuantity}
        />
        <ModalInputRow
          inputProps={register('packSize', { disabled: true })}
          labelKey="label.packSize"
          defaultValue={item?.availableQuantity}
        />
        <Divider />
      </Grid>
    </form>
  );
};
