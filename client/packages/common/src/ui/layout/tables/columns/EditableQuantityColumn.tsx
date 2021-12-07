import { InputAdornment, Tooltip, Typography } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { ColumnDefinition } from './types';
import { DomainObject } from '@common/types';
import { NumericTextInput } from '@common/components';

interface SomeQuantityEntity extends DomainObject {
  quantity: number;
  updateQuantity: (quantity: number) => void;
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
      <NumericTextInput
        sx={{
          maxHeight: 40,
        }}
        error={error}
        size="small"
        hiddenLabel
        value={buffer}
        onBlur={() => rowData.updateQuantity(value)}
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
  label: 'label.pack-quantity',
  accessor: (row: T) => String(row.quantity),
});
