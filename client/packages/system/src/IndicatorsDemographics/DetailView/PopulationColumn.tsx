import React from 'react';
import {
  CellProps,
  ColumnDefinition,
  NumberInputCell,
} from '@openmsupply-client/common';
import { GENERAL_POPULATION_ID } from '../api';
import { Row } from '../types';

const PopulationCell = (props: CellProps<Row>) => (
  <NumberInputCell
    {...props}
    decimalLimit={0}
    isDisabled={props.isDisabled || props.rowData.id !== GENERAL_POPULATION_ID}
  />
);

export const populationColumn = (): ColumnDefinition<Row> => ({
  label: 'label.current-population',
  accessor: ({ rowData }) => rowData[0],
  key: '0',
  Cell: PopulationCell,
  width: 190,
  sortable: false,
});
