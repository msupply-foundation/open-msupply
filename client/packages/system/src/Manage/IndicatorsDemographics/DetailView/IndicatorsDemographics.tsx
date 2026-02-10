import React, { useEffect, useState } from 'react';
import { AppBarButtons } from './AppBarButtons';
import {
  Box,
  MaterialTable,
  RecordPatch,
  useIntlUtils,
  useNotification,
  useSimpleMaterialTable,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useIndicatorsDemographicsColumns } from './columns';
import { Footer } from './Footer';
import { GENERAL_POPULATION_ID, useDemographicData } from '../api';
import {
  calculateAcrossRow,
  mapHeaderData,
  mapProjection,
  toInsertIndicator,
  toUpdateIndicator,
} from './utils';
import { HeaderData, Row } from '../types';

export const IndicatorsDemographics = () => {
  useUrlQueryParams({ initialSort: { key: 'name', dir: 'asc' } });
  const [headerDraft, setHeaderDraft] = useState<HeaderData>();
  const [indexPopulation, setIndexPopulation] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  const { error, success } = useNotification();
  const t = useTranslation();
  const { translateServerError } = useIntlUtils();

  const { draft, setDraft } = useDemographicData.indicator.list(headerDraft);
  const baseYear = headerDraft?.baseYear ?? 2024; // TODO: Allow the user to select the base year for their projections
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

    const patchedRow: Row = { ...existingRow, ...patch, isError: false };

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

  const createNewRow = (row: Row) => {
    setDraft({ ...draft, [row.id]: row });
    setIsDirty(true);
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
      await insertDemographicIndicator(toInsertIndicator(row, indexPopulation));
    } catch (e) {
      setDraft({ ...draft, [row.id]: { ...row, isError: true } });
      throw e;
    }
  };

  const updateIndicator = async (row: Row) => {
    try {
      await updateDemographicIndicator(toUpdateIndicator(row, indexPopulation));
    } catch (e) {
      setDraft({ ...draft, [row.id]: { ...row, isError: true } });
      throw e;
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
      .catch(e =>
        error(
          t('error.an-error-occurred', {
            message: translateServerError(e.message),
          })
        )()
      );
  };

  const cancel = () => {
    window.location.reload();
  };

  const columns = useIndicatorsDemographicsColumns({
    draft, setter, handlePopulationChange, handleGrowthChange, headerDraft
  });

  const table = useSimpleMaterialTable<Row>({
    tableId: 'indicators-demographics-table',
    columns,
    isLoading: isLoadingProjection,
    data: Object.values(draft),
    enableRowSelection: false,
  });

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
      <AppBarButtons createNewRow={createNewRow} rows={Object.values(draft)} />
      <Box sx={{ width: '100%' }} padding={0}>
        <MaterialTable table={table} />
      </Box>
      <Footer save={save} cancel={cancel} isDirty={isDirty} />
    </>
  );
};
