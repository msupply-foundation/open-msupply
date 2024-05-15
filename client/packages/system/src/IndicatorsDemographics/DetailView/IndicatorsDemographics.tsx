import React, { FC, useState } from 'react';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import {
  ColumnAlign,
  DataTable,
  NumUtils,
  RecordPatch,
  TableProvider,
  createTableStore,
  useColumns,
} from '@openmsupply-client/common';

// import { ActionsCell } from './ActionsCell';
import { percentageColumn } from './PercentageColumn';
import { nameColumn } from './NameColumn';

// enum RowModes {
//   Edit,
//   View,
// }

// interface RowModesModel {
//   id: string;
//   mode: RowModes;
// }

export interface Row {
  isNew: boolean;
  id: string;
  percentage?: number | null;
  name: string;
  year: number;
  year1: number;
  year2: number;
  year3: number;
  year4: number;
  year5: number;
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
    year2: 1100000,
    year3: 1100000,
    year4: 1100000,
    year5: 1100000,
  },
  {
    isNew: false,

    id: '2',
    percentage: 3.4,
    name: 'Pregnant women',
    year: 34000,
    year1: 37400,
    year2: 37400,
    year3: 37400,
    year4: 37400,
    year5: 37400,
  },
  {
    isNew: false,

    id: '3',
    percentage: 4.1,
    name: 'New born children',
    year: 41000,
    year1: 45100,
    year2: 45100,
    year3: 45100,
    year4: 45100,
    year5: 45100,
  },
];

const currentYear = new Date().getFullYear();

export const IndicatorsDemographicsComponent: FC = () => {
  const draftRows: Record<string, Row> = {};
  rows.forEach(row => (draftRows[row.id] = { ...row }));
  const [draft, setDraft] = useState<Record<string, Row>>(draftRows);

  const setter = (patch: RecordPatch<Row>) => {
    // set patch changes for generic setter
    const percentage = !patch.percentage ? 0 : patch.percentage / 100;
    const percentageChange = percentage != draft[patch.id]?.percentage;

    // set updated figures when percentage changes
    const updatedPatch = {
      ...patch,
      year: percentageChange
        ? NumUtils.round(percentage * (draft['1']?.year ?? 0))
        : 0,
      year1: percentageChange
        ? NumUtils.round(percentage * (draft['2']?.year1 ?? 0))
        : 0,
      year2: percentageChange
        ? NumUtils.round(percentage * (draft['2']?.year2 ?? 0))
        : 0,
      year3: percentageChange
        ? NumUtils.round(percentage * (draft['2']?.year3 ?? 0))
        : 0,
      year4: percentageChange
        ? NumUtils.round(percentage * (draft['2']?.year4 ?? 0))
        : 0,
      year5: percentageChange
        ? NumUtils.round(percentage * (draft['2']?.year5 ?? 0))
        : 0,
    } as Row;

    setDraft({ ...draft, [patch.id]: updatedPatch });
  };

  // do some maths on recalculate after inputting changed values:
  // const handleCalculate = () => {};

  // Save draft to DB
  const save = () => {
    console.info('api calling save to DB');
  };

  const columns = useColumns([
    [percentageColumn(), { setter }],
    [nameColumn(), { setter }],
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
    {
      key: 'year2',
      width: 180,
      align: ColumnAlign.Center,
      label: currentYear + 2,
    },
    {
      key: 'year3',
      width: 180,
      align: ColumnAlign.Center,
      label: currentYear + 3,
    },
    {
      key: 'year4',
      width: 180,
      align: ColumnAlign.Center,
      label: currentYear + 4,
    },
    {
      key: 'year5',
      width: 180,
      align: ColumnAlign.Center,
      label: currentYear + 5,
    },
  ]);

  return (
    <>
      <AppBarButtons></AppBarButtons>
      <Toolbar rows={rows} patch={setter} save={save}></Toolbar>
      <DataTable
        data={Object.values(draft)}
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
