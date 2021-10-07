import React from 'react';

import {
  Autocomplete,
  Divider,
  gql,
  Grid,
  Item,
  LabelledInputRow,
  request,
  TextField,
  UseFormRegister,
  useQuery,
  LoadingSpinner,
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

  return isLoading ? (
    <LoadingSpinner />
  ) : (
    <form onSubmit={onSubmit}>
      <Grid container>
        <LabelledInputRow
          inputProps={register('code')}
          labelKey="label.code"
          defaultValue={item?.code}
        />
        <Grid>
          <Autocomplete
            disablePortal
            options={data?.map(item => ({ label: item.name, ...item })) || []}
            sx={{ width: '540px' }}
            renderInput={params => (
              <TextField {...params} label="Item" variant="filled" />
            )}
            {...register('name')}
          />
        </Grid>
        <LabelledInputRow
          inputProps={register('quantity')}
          labelKey="label.quantity"
          defaultValue={item?.quantity}
        />
        <LabelledInputRow
          inputProps={register('packSize')}
          labelKey="label.packSize"
          defaultValue={item?.packSize}
        />
        <Divider />
      </Grid>
    </form>
  );
};
