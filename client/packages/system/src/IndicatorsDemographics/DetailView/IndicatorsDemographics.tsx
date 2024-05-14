import React, { FC, useState } from 'react';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import {
  ColumnAlign,
  DataTable,
  TableProvider,
  createTableStore,
  useColumns,
} from '@openmsupply-client/common';

// import { ActionsCell } from './ActionsCell';
import { percentageColumn } from './PercentageColumn';
import { nameColumn } from './NameColumn';

export interface IndicatorsTableProps {
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  save: () => void;
}

export enum RowModes {
  Edit,
  View,
}

export interface RowModesModel {
  id: string;
  mode: RowModes;
}

export interface Row {
  isNew: boolean;
  id: string;
  percentage: number;
  name: string;
  year: number;
  year1: number;
}

// data for display while api yet to be written
const rows: Row[] = [
  {
    isNew: false,
    id: '1',
    percentage: 100,
    name: 'General Population',
    year: 1000000,
    year1: 1100000,
  },
  {
    isNew: false,

    id: '2',
    percentage: 3.4,
    name: 'Pregnant women',
    year: 34000,
    year1: 37400,
  },
  {
    isNew: false,

    id: '3',
    percentage: 4.1,
    name: 'New born children',
    year: 41000,
    year1: 45100,
  },
];

const currentYear = new Date().getFullYear();

export const IndicatorsDemographicsComponent: FC = () => {
  const [draft, setDraft] = useState<Row[]>(rows);
  const [currentRow, setCurrentRow] = useState<Row>();
  console.info('current row: ', currentRow);

  // do some maths on recalculate after inputting changed values:
  // const handleCalculate = () => {};

  // Save draft to DB
  const save = () => {
    console.info('api calling save to DB');
  };

  const columns = useColumns([
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    [percentageColumn(), { setter: setCurrentRow }],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    [nameColumn(), { setter: setCurrentRow }],
    {
      key: 'year',
      width: 180,
      align: ColumnAlign.Center,
      label: currentYear,
    },
    {
      key: 'year1',
      width: 180,
      align: ColumnAlign.Center,
      label: currentYear + 1,
    },
  ]);

  return (
    <>
      <AppBarButtons></AppBarButtons>
      <Toolbar rows={rows} setRows={setDraft} save={save}></Toolbar>
      <DataTable
        data={draft}
        columns={columns}
        id={'indicators-demographics-table'}
        // enableColumnSelection={true}
      ></DataTable>
    </>
  );
};

export const IndicatorsDemographics: FC = () => (
  <TableProvider createStore={createTableStore}>
    <IndicatorsDemographicsComponent />;
  </TableProvider>
);
