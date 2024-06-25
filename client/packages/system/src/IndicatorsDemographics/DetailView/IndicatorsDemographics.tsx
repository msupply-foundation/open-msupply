import React, { useEffect, useState } from 'react';
import { AppBarButtons } from './AppBarButtons';
import {
  Box,
  ColumnAlign,
  DataTable,
  RecordPatch,
  TableProvider,
  createTableStore,
  useColumns,
  useFormatNumber,
  useNotification,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';

import { percentageColumn } from './PercentageColumn';
import { nameColumn } from './NameColumn';
import { GrowthRow } from './GrowthRow';
import { populationColumn } from './PopulationColumn';
import { Footer } from './Footer';
import { GENERAL_POPULATION_ID, useDemographicData } from '../api';
import {
  calculateAcrossRow,
  mapHeaderData,
  mapProjection,
  toIndicatorFragment,
} from './utils';
import { HeaderData, Row } from '../types';

const currentYear = new Date().getFullYear();

const IndicatorsDemographicsComponent = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
  });
  const [headerDraft, setHeaderDraft] = useState<HeaderData>();
  const [indexPopulation, setIndexPopulation] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const formatNumber = useFormatNumber();

  const { error, success } = useNotification();
  const t = useTranslation();

  const { draft, setDraft } = useDemographicData.indicator.list(headerDraft);
  const baseYear = headerDraft?.baseYear ?? 2024;

  const { data: projection, isLoading: isLoadingProjection } =
    useDemographicData.projection.get(baseYear);

  const {
    insertDemographicIndicator,
    invalidateQueries: invalidateDemographicQueries,
  } = useDemographicData.indicator.insert();
  const { mutateAsync: updateDemographicIndicator } =
    useDemographicData.indicator.update();

  const { upsertProjection, invalidateQueries: invalidateProjectionQueries } =
    useDemographicData.projection.upsert();

  const invalidateQueries = () => {
    invalidateDemographicQueries();
    invalidateProjectionQueries(baseYear);
  };

  const handlePopulationChange = (patch: RecordPatch<Row>) => {
    setIsDirty(true);

    const basePopulation = patch['0'] ?? 0;
    let updatedDraft: Record<string, Row> = {};

    const indexPopulationChange =
      basePopulation !== draft[patch.id]?.basePopulation &&
      patch.id === GENERAL_POPULATION_ID;

    if (indexPopulationChange) setIndexPopulation(basePopulation);

    Object.values(draft).forEach(row => {
      const updatedRow = calculateAcrossRow(
        row,
        headerDraft,
        indexPopulationChange ? basePopulation : indexPopulation
      );
      updatedDraft = { ...updatedDraft, [updatedRow.id]: updatedRow };
    });
    setDraft(updatedDraft);
  };

  const setter = (patch: RecordPatch<Row>) => {
    const percentage = !patch.percentage ? 0 : patch.percentage;
    const percentageChange = percentage != draft[patch.id]?.percentage;

    const existingRow = draft[patch.id];
    if (!existingRow) return;

    setIsDirty(true);

    const patchedRow: Row = { ...existingRow, ...patch };

    // change state of name only if only name changes
    if (!percentageChange) {
      setDraft({ ...draft, [patch.id]: patchedRow });
      return;
    }

    const updatedRow = calculateAcrossRow(
      patchedRow,
      headerDraft,
      indexPopulation
    );
    setDraft({ ...draft, [patch.id]: updatedRow });
  };

  // generic function for handling percentage change, and then re calculating the values of that year
  const handleGrowthChange = (updatedHeader: HeaderData) => {
    setIsDirty(true);

    setHeaderDraft(updatedHeader);
    calculateDown(updatedHeader);
  };

  const calculateDown = (updatedHeader: HeaderData) => {
    const updatedDraft: Record<string, Row> = {};

    Object.values(draft).forEach(row => {
      const updatedRow = calculateAcrossRow(
        row,
        updatedHeader,
        indexPopulation
      );
      updatedDraft[updatedRow.id] = updatedRow;
    });

    setDraft(updatedDraft);
  };

  const insertIndicator = async (row: Row) => {
    try {
      await insertDemographicIndicator(
        toIndicatorFragment(row, indexPopulation)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const updateIndicator = async (row: Row) => {
    try {
      await updateDemographicIndicator(
        toIndicatorFragment(row, indexPopulation)
      );
    } catch (e) {
      console.error(e);
    }
  };

  // save rows excluding generalRow
  const save = async () => {
    setIsDirty(false);
    const rows = Object.values(draft).filter(
      row => row.id !== GENERAL_POPULATION_ID
    );

    await Promise.all(
      rows.map(async indicator => {
        indicator.isNew
          ? await insertIndicator(indicator)
          : await updateIndicator(indicator);
      })
    )
      .then(async () => {
        if (headerDraft !== undefined)
          await upsertProjection(mapProjection(headerDraft));
      })
      .then(() => {
        success(t('success.data-saved'))();
        invalidateQueries();
      })
      .catch(e => error(`${t('error.problem-saving')}: ${e.message}`)());
  };

  const cancel = () => {
    window.location.reload();
  };

  const columns = useColumns<Row>(
    [
      [nameColumn(), { setter }],
      [percentageColumn(), { setter }],
      [populationColumn(), { setter: handlePopulationChange }],
      yearColumn(1, formatNumber.format),
      yearColumn(2, formatNumber.format),
      yearColumn(3, formatNumber.format),
      yearColumn(4, formatNumber.format),
      yearColumn(5, formatNumber.format),
    ],
    { sortBy, onChangeSortBy: updateSortQuery },
    [draft, indexPopulation, sortBy]
  );

  useEffect(() => {
    if (!draft || !!indexPopulation) return;

    const generalPopulationRow = draft[GENERAL_POPULATION_ID];
    if (!generalPopulationRow) return;

    setIndexPopulation(generalPopulationRow.basePopulation);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    if (!projection) return;

    setHeaderDraft(mapHeaderData(projection));
  }, [projection]);

  return (
    <>
      <AppBarButtons
        addRow={newRow => setDraft({ ...draft, [newRow.id]: newRow })}
        rows={Object.values(draft)}
      ></AppBarButtons>
      <Box sx={{ width: '100%' }} padding={0}>
        <GrowthRow
          columns={columns}
          data={headerDraft}
          isLoading={isLoadingProjection}
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

export const IndicatorsDemographics = () => (
  <TableProvider createStore={createTableStore}>
    <IndicatorsDemographicsComponent />
  </TableProvider>
);

const yearColumn = (year: number, format: (n: number) => string) => ({
  key: String(year),
  width: 150,
  align: ColumnAlign.Right,
  label: undefined,
  labelProps: { defaultValue: currentYear + year },
  sortable: false,
  accessor: ({ rowData }: { rowData: Row }) => {
    // using a switch to appease typescript
    switch (year) {
      case 1:
        return format(rowData[1]);
      case 2:
        return format(rowData[2]);
      case 3:
        return format(rowData[3]);
      case 4:
        return format(rowData[4]);
      case 5:
        return format(rowData[5]);
      default:
        return '';
    }
  },
});
