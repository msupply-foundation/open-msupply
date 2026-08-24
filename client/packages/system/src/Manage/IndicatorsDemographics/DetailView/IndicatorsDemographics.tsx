import React, { useEffect, useMemo, useState } from 'react';
import { AppBarButtons } from './AppBarButtons';
import {
  Box,
  MaterialTable,
  RecordPatch,
  useConfirmOnLeaving,
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
  mapHeaderData,
  mapProjection,
  toInsertIndicator,
  toUpdateIndicator,
} from './utils';
import { HeaderData, Row } from '../types';

export const IndicatorsDemographics = () => {
  useUrlQueryParams({ initialSort: { key: 'name', dir: 'asc' } });
  const [headerDraft, setHeaderDraft] = useState<HeaderData>();
  const { isDirty, setIsDirty } = useConfirmOnLeaving(
    'indicators-demographics'
  );

  const { error, success } = useNotification();
  const t = useTranslation();
  const { translateServerError } = useIntlUtils();

  const {
    draft,
    indexPopulation,
    setDraft,
    addRow,
    resetEdits,
  } = useDemographicData.indicator.list(headerDraft);
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

  const setter = (patch: RecordPatch<Row>) => {
    setIsDirty(true);
    setDraft(patch);
  };

  const handlePopulationChange = (patch: RecordPatch<Row>) => {
    setIsDirty(true);
    setDraft(patch);
  };

  const handleGrowthChange = (updatedHeader: HeaderData) => {
    setIsDirty(true);
    setHeaderDraft(updatedHeader);
  };

  const createNewRow = (row: Row) => {
    setIsDirty(true);
    addRow(row);
  };

  const insertIndicator = async (row: Row) => {
    try {
      await insertDemographicIndicator(toInsertIndicator(row, indexPopulation));
    } catch (e) {
      setDraft({ id: row.id, isError: true });
      throw e;
    }
  };

  const updateIndicator = async (row: Row) => {
    try {
      await updateDemographicIndicator(toUpdateIndicator(row, indexPopulation));
    } catch (e) {
      setDraft({ id: row.id, isError: true });
      throw e;
    }
  };

  const save = async () => {
    setIsDirty(false);
    const rows = Object.values(draft);

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
        resetEdits();
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
    resetEdits();
    setIsDirty(false);
    if (projection) setHeaderDraft(mapHeaderData(projection));
  };

  const columns = useIndicatorsDemographicsColumns({
    draft, setter, handlePopulationChange, handleGrowthChange, headerDraft
  });

  // Always have General Demographics at the top of the table
  const rows = useMemo(() => {
    const all = Object.values(draft);
    return all.sort((a, b) => {
      if (a.id === GENERAL_POPULATION_ID) return -1;
      if (b.id === GENERAL_POPULATION_ID) return 1;
      return 0;
    });
  }, [draft]);

  const table = useSimpleMaterialTable<Row>({
    tableId: 'indicators-demographics-table',
    columns,
    isLoading: isLoadingProjection,
    data: rows,
    enableRowSelection: false,
  });

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
