import React from 'react';

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

interface ItemDetailsProps {
  item?: Item;
  onSubmit: () => void;
  register: UseFormRegister<Item>;
}

export const ItemDetails: React.FC<ItemDetailsProps> = ({
  item,
  onSubmit,
  register,
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

  return (
    <form onSubmit={onSubmit}>
      <Grid container>
        <ModalInputRow
          inputProps={register('code')}
          labelKey="label.code"
          defaultValue={item?.code}
        />
        <ModalRow>
          <ModalLabel labelKey="label.item" />
          <ModalAutocomplete
            inputProps={register('name')}
            options={options}
            loading={isLoading}
          />
        </ModalRow>
        <ModalInputRow
          inputProps={register('quantity')}
          labelKey="label.quantity"
          defaultValue={item?.quantity}
        />
        <ModalInputRow
          inputProps={register('packSize')}
          labelKey="label.packSize"
          defaultValue={item?.packSize}
        />
        <Divider />
      </Grid>
    </form>
  );
};
