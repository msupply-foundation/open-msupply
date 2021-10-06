import { ColumnDefinition } from './types';
import { DomainObject } from '../../../../types';
import { TextField, InputAdornment, Tooltip, Typography } from '@mui/material';
import React, { useState, useEffect, Dispatch } from 'react';

interface SomeQuantityEntity extends DomainObject {
  quantity: number;
  dispatch: Dispatch<{
    type: 'CustomerInvoice/updateQuantity';
    payload: { rowKey: string; quantity: number };
  }> | null;
}

export const getEditableQuantityColumn = <
  T extends SomeQuantityEntity
>(): ColumnDefinition<T> => ({
  key: 'quantity',
  width: 100,
  Cell: ({ rowData }) => {
    const { quantity } = rowData;
    const [buffer, setBuffer] = useState(String(quantity));
    const [value, setValue] = useState(quantity);
    const [error, setError] = useState(false);

    const tryUpdateValue = (
      event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
    ) => {
      const {
        target: { value },
      } = event;

      const asNumber = Number(value);
      const isValid = Number.isInteger(asNumber) && asNumber >= 0;

      if (isValid) {
        setValue(asNumber);
        setError(false);
      } else {
        setError(true);
      }

      setBuffer(value);
    };

    useEffect(() => {
      setValue(quantity);
      setBuffer(String(quantity));
      setError(false);
    }, [rowData]);

    return (
      <TextField
        sx={{ maxHeight: 40 }}
        error={error}
        variant="filled"
        size="small"
        helperText="Incorrect value"
        hiddenLabel
        value={buffer}
        onBlur={() =>
          rowData.dispatch?.({
            type: 'CustomerInvoice/updateQuantity',
            payload: { rowKey: rowData.id ?? '', quantity: value },
          })
        }
        InputProps={{
          endAdornment: error ? (
            <InputAdornment position="end">
              <Tooltip title="Mate, what you doing?">
                <Typography sx={{ color: 'red' }}>⚠</Typography>
              </Tooltip>
            </InputAdornment>
          ) : null,
        }}
        onChange={tryUpdateValue}
      />
    );
  },
  label: 'label.quantity',
  accessor: (row: T) => String(row.quantity),
});
