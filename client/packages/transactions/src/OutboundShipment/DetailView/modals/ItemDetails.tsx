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

  // const {selectedItem, setSelectedItem}
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
  const selectItem = (
    _event: SyntheticEvent<Element, Event>,
    value: Item | null
  ) => {
    setValue('id', value?.id || '');
    setValue('code', value?.code || '');
    setValue('name', value?.name || '');
  };
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
            onChange={selectItem}
            options={options}
            loading={isLoading}
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
