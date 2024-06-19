import React from 'react';
import {
  CellProps,
  ColumnDefinition,
  InputAdornment,
  NumberInputCell,
} from '@openmsupply-client/common';
import { GENERAL_POPULATION_ID } from '../api';
import { Row } from '../types';

const PercentageCell = (props: CellProps<Row>) => (
  <NumberInputCell
    {...props}
    max={100}
    decimalLimit={2}
    isDisabled={props.isDisabled || props.rowData.id === GENERAL_POPULATION_ID}
    TextInputProps={{
      InputProps: {
        endAdornment: <InputAdornment position="end">%</InputAdornment>,
      },
    }}
  />
);

export const percentageColumn = (): ColumnDefinition<Row> => ({
  label: 'label.percentage',
  key: 'percentage',
  Cell: PercentageCell,
  width: 125,
  sortable: false,
});
