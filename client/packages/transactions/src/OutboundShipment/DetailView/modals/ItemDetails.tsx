import React from 'react';

import {
  Grid,
  Input,
  InputLabel,
  Item,
  UseFormRegister,
} from '@openmsupply-client/common';

interface ItemDetailsProps {
  item?: Item;
  onSubmit: () => void;
  register: UseFormRegister<Item>;
}

const inputStyle = {
  backgroundColor: '#f2f2f5',
  borderRadius: '8px',
  color: '#555770',
  padding: '4px 8px',
  width: '240px',
};

const labelStyle = {
  color: '#1c1c28',
  fontSize: '12px',
};

export const ItemDetails: React.FC<ItemDetailsProps> = ({
  item,
  onSubmit,
  register,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <Grid container sm={2}>
        <Grid>
          <Grid item>
            <InputLabel sx={labelStyle}>Item</InputLabel>
          </Grid>
          <Grid item>
            <Input
              defaultValue={item?.name}
              disableUnderline
              sx={inputStyle}
              {...register('name')}
            />
          </Grid>
        </Grid>
        <Grid>
          <Grid item>
            <InputLabel sx={labelStyle}>Quantity</InputLabel>
          </Grid>
          <Grid item>
            <Input
              defaultValue={item?.quantity}
              disableUnderline
              sx={inputStyle}
              {...register('quantity')}
            />
          </Grid>
        </Grid>
      </Grid>
    </form>
  );
};
