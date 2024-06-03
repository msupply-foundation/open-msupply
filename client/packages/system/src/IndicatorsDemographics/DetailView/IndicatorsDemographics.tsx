import React, { FC, useState } from 'react';
import { AppBarButtons } from './AppBarButtons';
import {
  ArrayUtils,
  Box,
  ColumnAlign,
  DataTable,
  RecordPatch,
  TableProvider,
  createTableStore,
  useColumns,
  useUrlQueryParams,
} from '@openmsupply-client/common';

import { percentageColumn } from './PercentageColumn';
import { nameColumn } from './NameColumn';
import { GrowthRow } from './GrowthRow';
import { populationColumn } from './PopulationColumn';
import { Footer } from './Footer';
import { GENERAL_POPULATION_ID, useDemographicData } from '../api';
import { recursiveCalculate, toIndicatorFragment } from './utils';

export interface Row {
  isNew: boolean;
  id: string;
  percentage?: number | null;
  name: string;
  baseYear: number;
  basePopulation: number;
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
}

export interface HeaderValue {
  id: string;
  value: number;
}

// header data (still unsure how this will be stored)
const headerData: HeaderValue[] = [
  { id: '1', value: 1.1 },
  { id: '2', value: 1.2 },
  { id: '3', value: 1.2 },
  { id: '4', value: 1.1 },
  { id: '5', value: 1.0 },
];

export const toRow = (row: {
  __typename?: 'DemographicIndicatorNode';
  id: string;
  name: string;
  baseYear?: number;
  basePopulation?: number;
  year1Projection?: number;
  year2Projection?: number;
  year3Projection?: number;
  year4Projection?: number;
  year5Projection?: number;
  populationPercentage?: number;
}): Row => ({
  isNew: false,
  id: row.id,
  percentage: row.populationPercentage,
  name: row.name,
  baseYear: row.baseYear ?? 0,
  basePopulation: row.basePopulation ?? 0,
  0: row.year1Projection ?? 0,
  1: row.year2Projection ?? 0,
  2: row.year3Projection ?? 0,
  3: row.year4Projection ?? 0,
  4: row.year5Projection ?? 0,
});

const currentYear = new Date().getFullYear();

const IndicatorsDemographicsComponent: FC = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({
    initialSort: { key: 'percentage', dir: 'desc' },
  });

  const { draft, setDraft } = useDemographicData.document.listIndicator();

  const draftRows: Record<string, Row> = {};

  const draftHeaders = ArrayUtils.toObject(headerData);
  const [isDirty, setIsDirty] = useState(false);
  const [headerDraft, setHeaderDraft] =
    useState<Record<string, HeaderValue>>(draftHeaders);

  const { insertDemographicIndicator, invalidateQueries } =
    useDemographicData.document.insertIndicator();
  const { mutateAsync: updateDemographicIndicator } =
    useDemographicData.document.updateIndicator();
  const currentIds = Object.keys(draft);

  const PopulationChange = (patch: RecordPatch<Row>) => {
    setIsDirty(true);
    const currentDraft = { ...draft, [patch.id]: patch } as Record<string, Row>;
    let updatedDraft = {} as Record<string, Row>;
    // TODO
    const indexValue = patch[0] ?? undefined;
    Object.keys(currentDraft).forEach(rowKey => {
      const updatedRow = calculateAcrossRow(
        currentDraft[rowKey] as Row,
        draftHeaders,
        indexValue
      );
      updatedDraft = { ...updatedDraft, [updatedRow.id]: updatedRow };
    });
    setDraft({ ...currentDraft, ...updatedDraft });
  };

  const setter = (patch: RecordPatch<Row>) => {
    const updatedDraft = { ...draft };
    const percentage = Number(!patch.percentage ? 0 : patch.percentage);
    const percentageChange = percentage != draft[patch.id]?.percentage;

    setIsDirty(true);

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
    setIsDirty(true);
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
      const updatedRow = calculateAcrossRow(
        currentDraft[row] as Row,
        updatedHeader
      );
      updatedDraft = { ...updatedDraft, [updatedRow.id]: updatedRow };
    });
    setHeaderDraft(updatedHeader);
    setDraft({ ...currentDraft, ...updatedDraft });
  };

  const calculateAcrossRow = (
    row: Row,
    updatedHeader: { [x: string]: HeaderValue },
    indexValue?: number | undefined
  ) => {
    let updatedRow = row;
    // only update numeric entries
    const rowNumberKeys = Object.keys(row).filter(
      key =>
        !isNaN(parseFloat(key)) &&
        !(row.id === GENERAL_POPULATION_ID && key == '0')
    );

    Object.keys(rowNumberKeys).forEach(key => {
      const columnKey = parseInt(key);
      updatedRow = {
        ...updatedRow,
        [columnKey]: recursiveCalculate(
          columnKey,
          updatedHeader,
          row,
          indexValue
        ),
      };
    });
    return updatedRow;
  };

  const insertIndicator = async (row: Row) => {
    try {
      await insertDemographicIndicator(toIndicatorFragment(row));
    } catch (e) {
      console.error(e);
    }
  };

  const updateIndicator = async (row: Row) => {
    try {
      await updateDemographicIndicator(toIndicatorFragment(row));
    } catch (e) {
      console.error(e);
    }
  };

  const save = async () => {
    setIsDirty(false);
    const remainingRows = Object.keys(draftRows).map(key => draftRows[key]);
    while (remainingRows.length) {
      await Promise.all(
        remainingRows.splice(0).map(async indicator => {
          const indicatorExists = currentIds?.includes(indicator?.id ?? '');
          if (indicator != undefined) {
            indicatorExists
              ? await updateIndicator(indicator)
              : await insertIndicator(indicator);
          }
        })
      ).then(() => invalidateQueries());
    }
  };

  // TODO cancel changes (re call data from DB)
  const cancel = () => {
    setIsDirty(false);
    console.info('re set data to DB saved (cancel all changes)');
  };

  const columns = useColumns<Row>(
    [
      [percentageColumn(), { setter }],
      [nameColumn(), { setter }],
      [populationColumn(), { setter: PopulationChange }],
      {
        key: '1',
        width: 150,
        align: ColumnAlign.Right,
        label: undefined,
        labelProps: { defaultValue: currentYear + 1 },
      },
      {
        key: '2',
        width: 150,
        align: ColumnAlign.Right,
        label: undefined,
        labelProps: { defaultValue: currentYear + 2 },
      },
      {
        key: '3',
        width: 150,
        align: ColumnAlign.Right,
        label: undefined,
        labelProps: { defaultValue: currentYear + 3 },
      },
      {
        key: '4',
        width: 150,
        align: ColumnAlign.Right,
        label: undefined,
        labelProps: { defaultValue: currentYear + 4 },
      },
      {
        key: '5',
        width: 150,
        align: ColumnAlign.Right,
        label: undefined,
        labelProps: { defaultValue: currentYear + 5 },
      },
    ],
    { sortBy, onChangeSortBy: updateSortQuery },
    [draft]
  );

  return (
    <>
      <AppBarButtons patch={setter}></AppBarButtons>
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
        ></DataTable>
      </Box>
      <Footer save={save} cancel={cancel} isDirty={isDirty} />
    </>
  );
};

export const IndicatorsDemographics: FC = () => (
  <TableProvider createStore={createTableStore}>
    <IndicatorsDemographicsComponent />
  </TableProvider>
);
