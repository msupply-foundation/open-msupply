import React, { FC, useState } from 'react';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import {
  Box,
  ColumnAlign,
  DataTable,
  NumUtils,
  RecordPatch,
  TableProvider,
  createTableStore,
  useColumns,
  useUrlQueryParams,
} from '@openmsupply-client/common';

import { percentageColumn } from './PercentageColumn';
import { nameColumn } from './NameColumn';
import { GrowthRow } from './GrowthRow';

export interface Row {
  isNew: boolean;
  id: string;
  percentage?: number | null;
  name: string;
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface HeaderValue {
  id: string;
  value: number;
}

// arbitrary data until API is written
const rows: Row[] = [
  {
    isNew: false,
    id: '1',
    percentage: 100,
    name: 'General Population',
    0: 1000000,
    1: 1100000,
    2: 1100000,
    3: 1100000,
    4: 1100000,
    5: 1100000,
  },
  {
    isNew: false,
    id: '2',
    percentage: 3.4,
    name: 'Pregnant women',
    0: 34000,
    1: 37400,
    2: 37400,
    3: 37400,
    4: 37400,
    5: 37400,
  },
  {
    isNew: false,
    id: '3',
    percentage: 4.1,
    name: 'New born children',
    0: 41000,
    1: 45100,
    2: 45100,
    3: 45100,
    4: 45100,
    5: 45100,
  },
];

// header data (still unsure how this will be stored)
const headerData: HeaderValue[] = [
  { id: '1', value: 1.1 },
  { id: '2', value: 1.2 },
  { id: '3', value: 1.2 },
  { id: '4', value: 1.1 },
  { id: '5', value: 1.0 },
];

const currentYear = new Date().getFullYear();

export const IndicatorsDemographicsComponent: FC = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({
    initialSort: { key: 'percentage', dir: 'desc' },
  });

  const draftRows: Record<string, Row> = {};
  rows.forEach(row => (draftRows[row.id] = { ...row }));
  const draftHeaders: Record<string, HeaderValue> = {};
  headerData.forEach(header => (draftHeaders[header.id] = { ...header }));
  const [draft, setDraft] = useState<Record<string, Row>>(draftRows);
  const [headerDraft, setHeaderDraft] =
    useState<Record<string, HeaderValue>>(draftHeaders);

  const setter = (patch: RecordPatch<Row>) => {
    const updatedDraft = { ...draft };

    const percentage = Number(!patch.percentage ? 0 : patch.percentage);

    const percentageChange = percentage != draft[patch.id]?.percentage;
    // change state of name only if only name changes

    if (!percentageChange) {
      setDraft({ ...updatedDraft, [patch.id]: { ...patch } as Row });
      return;
    }

    const updatedRow = calculateAcrossRow({ ...patch } as Row, headerDraft);

    setDraft({ ...updatedDraft, [patch.id]: updatedRow });
  };

  // generic function for handling percentage change, and then re calculating the values of that year
  const handleGrowthChange = (patch: RecordPatch<HeaderValue>) => {
    const updatedHeaderDraft = { ...headerDraft };
    const updatedPatch = {
      ...patch,
      value: patch.value ?? 0,
    };
    setHeaderDraft({ ...updatedHeaderDraft, [patch.id]: updatedPatch });
    calculateDown(patch);
  };

  const calculateDown = (patch: RecordPatch<HeaderValue>) => {
    const oldHeaderDraft = { ...headerDraft };
    const updatedHeader = {
      ...oldHeaderDraft,
      [patch.id]: { ...patch } as HeaderValue,
    };
    const currentDraft = { ...draft };
    let updatedDraft = {};
    Object.keys(currentDraft).forEach(row => {
      // console.log('calculating: ', draft[row]);
      const updatedRow = calculateAcrossRow(
        currentDraft[row] as Row,
        updatedHeader
      );
      // console.log('updatedRow', updatedRow);
      updatedDraft = { ...updatedDraft, [parseInt(updatedRow.id)]: updatedRow };
    });
    setHeaderDraft(updatedHeader);
    setDraft({ ...currentDraft, ...updatedDraft });
  };

  const calculateAcrossRow = (
    row: Row,
    updatedHeader: { [x: string]: HeaderValue }
  ) => {
    let updatedRow = row;
    const rowNumberKeys = Object.keys(row).filter(
      key => !isNaN(parseFloat(key))
    );
    Object.keys(rowNumberKeys).forEach(key => {
      const columnKey = parseInt(key);
      updatedRow = {
        ...updatedRow,
        [columnKey]: recursiveCalculate(columnKey, updatedHeader, row),
      };
    });
    return updatedRow;
  };

  // calculate the row value based on percentae, headers, and previous row value
  const recursiveCalculate = (
    key: number,
    updatedHeader: { [x: string]: HeaderValue },
    row: Row
  ): number => {
    const headerValue = updatedHeader[key];
    if (key > 0) {
      return headerValue
        ? (NumUtils.round(
            recursiveCalculate(key - 1, updatedHeader, row) *
              (headerValue.value ?? 0)
          ) as number)
        : 0;
    } else {
      const indexValue = Object.keys(draft)[0];
      const indexRow = indexValue ? draft[indexValue] : undefined;
      const number = indexRow ? indexRow[0] : 0;
      return NumUtils.round(number * ((row?.percentage ?? 0) / 100));
    }
  };

  // TODO save draft to DB
  const save = () => {
    console.info('api calling save to DB');
  };

  // TODO cancel changes (re call data from DB)
  const cancel = () => {
    console.info('re set data to DB saved (cancel all changes)');
  };

  const columns = useColumns(
    [
      [percentageColumn(), { setter }],
      [nameColumn(), { setter }],
      {
        key: '0',
        width: 180,
        align: ColumnAlign.Center,
        label: currentYear,
      },
      {
        key: '1',
        width: 180,
        align: ColumnAlign.Center,
        label: currentYear + 1,
      },
      {
        key: '2',
        width: 180,
        align: ColumnAlign.Center,
        label: currentYear + 2,
      },
      {
        key: '3',
        width: 180,
        align: ColumnAlign.Center,
        label: currentYear + 3,
      },
      {
        key: '4',
        width: 180,
        align: ColumnAlign.Center,
        label: currentYear + 4,
      },
      {
        key: '5',
        width: 180,
        align: ColumnAlign.Center,
        label: currentYear + 5,
      },
    ],
    { sortBy, onChangeSortBy: updateSortQuery },
    [draft]
  );

  return (
    <>
      <AppBarButtons
        rows={rows}
        patch={setter}
        save={save}
        cancel={cancel}
      ></AppBarButtons>
      <Toolbar></Toolbar>
      <Box>
        <GrowthRow
          columns={columns}
          data={headerDraft}
          setData={handleGrowthChange}
        ></GrowthRow>
        <DataTable
          data={Object.values(draft)}
          columns={columns}
          id={'indicators-demographics-table'}
          // enableColumnSelection={true}
        ></DataTable>
      </Box>
    </>
  );
};

export const IndicatorsDemographics: FC = () => (
  <TableProvider createStore={createTableStore}>
    <IndicatorsDemographicsComponent />
  </TableProvider>
);
