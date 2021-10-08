import React, { SyntheticEvent } from 'react';

import {
  Divider,
  Grid,
  Item,
  ModalAutocomplete,
  ModalInputRow,
  ModalLabel,
  ModalRow,
  UseFormRegister,
  gql,
  request,
  useQuery,
  createFilterOptions,
  useTranslation,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { UseFormSetValue } from 'react-hook-form';

interface ItemDetailsProps {
  item?: Item;
  onSubmit: () => void;
  register: UseFormRegister<Item>;
  setValue: UseFormSetValue<Item>;
}

export const ItemDetails: React.FC<ItemDetailsProps> = ({
  item,
  onSubmit,
  register,
  setValue,
}) => {
  const listQueryFn = async (): Promise<Item[]> => {
    const { items } = await request(
      Environment.API_URL,
      gql`
        query items {
          items {
            id
            code
            name
          }
        }
      `
    );
    return items;
  };

  const t = useTranslation();
  const { data, isLoading } = useQuery(
    ['item', 'list'],
    listQueryFn
    // {
    //   onError: onError || defaultErrorHandler,
    //   useErrorBoundary: (error: ClientError): boolean =>
    //     error.response?.status >= 500,
    // }
  );
  const options =
    data?.slice(0, 100).map(item => ({ label: item.name, ...item })) || [];

  const filterOptions = createFilterOptions({
    stringify: (item: Item) => `${item.code} ${item.name}`,
  });

  const renderOption = (
    props: React.HTMLAttributes<HTMLLIElement>,
    item: Item
  ) => (
    <li
      {...props}
      key={item.code}
      style={{ color: '#8f90a6', backgroundColor: '#fafafc' }}
    >
      <span style={{ width: 100 }}>{item.code}</span>
      <span style={{ width: 500 }}>{item.name}</span>0
    </li>
  );

  const selectItem = (
    _event: SyntheticEvent<Element, Event>,
    value: Item | null
  ) => {
    setValue('id', value?.id || '');
    setValue('code', value?.code || '');
    setValue('name', value?.name || '');
  };

  register('id', { required: true });
  return (
    <form onSubmit={onSubmit}>
      <Grid container>
        <ModalInputRow
          inputProps={register('code', { disabled: true })}
          labelKey="label.code"
          defaultValue={item?.code}
        />
        <ModalRow>
          <ModalLabel labelKey="label.item" />
          <ModalAutocomplete<Item>
            filterOptions={filterOptions}
            loading={isLoading}
            noOptionsText={t('error.no-items')}
            onChange={selectItem}
            options={options}
            renderOption={renderOption}
            width={540}
          />
        </ModalRow>
        <ModalInputRow
          inputProps={register('quantity')}
          labelKey="label.quantity"
          defaultValue={item?.quantity}
        />
        <ModalInputRow
          inputProps={register('packSize', { disabled: true })}
          labelKey="label.packSize"
          defaultValue={item?.packSize}
        />
        <Divider />
      </Grid>
    </form>
  );
};
