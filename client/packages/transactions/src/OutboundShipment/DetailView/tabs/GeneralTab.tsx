import {
  Tooltip,
  Typography,
  ColumnDefinition,
  ColumnSetBuilder,
  Item,
  RemoteDataTable,
  useColumns,
  useQueryParams,
  useSortedData,
  TextField,
  InputAdornment,
  DomainObject,
} from '@openmsupply-client/common';
import React, { FC, useState, useEffect } from 'react';

interface GeneralTabProps<T> {
  data: T[];
}

interface SomeQuantityEntity extends DomainObject {
  quantity: number;
  setQuantity: (rowKey: number, newQuantity: number) => void;
}

const getEditableQuantityColumn = <
  T extends SomeQuantityEntity
>(): ColumnDefinition<T> => ({
  key: 'quantity',
  width: 300,
  Cell: ({ rowData, rowKey }) => {
    const { quantity } = rowData;
    const [buffer, setBuffer] = useState(quantity);
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

      setBuffer(asNumber);
    };

    useEffect(() => {
      setValue(quantity);
      setBuffer(quantity);
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
        onBlur={() => rowData.setQuantity(Number(rowKey), value)}
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

export const GeneralTab: FC<GeneralTabProps<Item>> = ({ data }) => {
  const { pagination } = useQueryParams({ key: 'quantity' });
  const { sortedData, onChangeSortBy, sortBy } = useSortedData(data ?? [], {
    key: 'quantity',
  });

  const defaultColumns = new ColumnSetBuilder<Item>()
    .addColumn('code')
    .addColumn('name')
    .addColumn('packSize')
    .addColumn(getEditableQuantityColumn())
    .build();

  const columns = useColumns(defaultColumns);

  return (
    <RemoteDataTable
      sortBy={sortBy}
      pagination={{ ...pagination, total: data.length }}
      columns={columns}
      data={sortedData.slice(
        pagination.offset,
        pagination.offset + pagination.first
      )}
      onSortBy={onChangeSortBy}
      onChangePage={pagination.onChangePage}
      noDataMessageKey="error.no-items"
    />
  );
};
