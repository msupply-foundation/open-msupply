import { InputAdornment, Tooltip, Typography } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { ColumnDefinition } from './types';
import { RecordWithId } from '@common/types';
import { NumericTextInput } from '@common/components';

interface SomeQuantityEntity extends RecordWithId {
  quantity: number;
  updateQuantity: (quantity: number) => void;
}

export const getEditableQuantityColumn = <
  T extends SomeQuantityEntity,
>(): ColumnDefinition<T> => ({
  key: 'quantity',
  width: 100,
  Cell: ({ rowData, isDisabled }) => {
    const { quantity } = rowData;
    const [buffer, setBuffer] = useState(quantity);
    const [value, setValue] = useState(quantity);
    const [error, setError] = useState(false);

    const tryUpdateValue = (value: number | undefined) => {
      if (value === undefined) return;
      const isValid = Number.isInteger(value) && value >= 0;

      if (isValid) {
        setValue(value);
        setError(false);
      } else {
        setError(true);
      }

      setBuffer(value);
    };

    useEffect(() => {
      setValue(quantity);
      setBuffer(quantity);
      setError(false);
    }, [rowData]);

    return (
      <NumericTextInput
        sx={{
          maxHeight: 40,
        }}
        error={error}
        disabled={isDisabled}
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
  label: 'label.num-packs',
  accessor: ({ rowData }) => String(rowData.quantity),
});
