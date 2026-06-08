import {
  RecordPatch,
  useQuery,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';
import { useCallback, useMemo, useState } from 'react';
import { GENERAL_POPULATION_ID } from '../..';
import {
  calculateAcrossRow,
  toDemographicIndicatorRow,
} from '../../../DetailView/utils';
import { HeaderData, Row } from '../../../types';

type RowEdit = Partial<Row> & { isNew?: boolean };

export const useDemographicIndicators = (headerData?: HeaderData) => {
  const t = useTranslation();
  const api = useDemographicsApi();
  const { queryParams } = useUrlQueryParams({
    filters: [{ key: 'name' }, { key: 'basePopulation' }, { key: 'id' }],
  });
  const { data, isLoading } = useQuery({
    queryKey: api.keys.paramIndicatorList(queryParams),
    queryFn: () => api.getIndicators.list(queryParams),
  });

  const [edits, setEdits] = useState<Record<string, RowEdit>>({});

  const indexPopulation = useMemo<number>(() => {
    const local = edits[GENERAL_POPULATION_ID]?.[0];
    if (typeof local === 'number') return local;
    const generalNode = data?.nodes.find(n => n.id === GENERAL_POPULATION_ID);
    return generalNode?.basePopulation ?? 0;
  }, [data, edits]);

  const draft = useMemo<Record<string, Row>>(() => {
    if (!data || !headerData) return {};
    const rows: Record<string, Row> = {};

    for (const node of data.nodes) {
      const base = toDemographicIndicatorRow({
        ...node,
        // Always use the translated name for the general population row since
        // it wasn't added by the user and is hardcoded in En
        name:
          node.id === GENERAL_POPULATION_ID
            ? t('label.general-population')
            : node.name,
      });
      const merged: Row = { ...base, ...edits[node.id] };
      rows[node.id] = calculateAcrossRow(merged, headerData, indexPopulation);
    }

    for (const [id, edit] of Object.entries(edits)) {
      if (rows[id] || !edit.isNew) continue;
      rows[id] = calculateAcrossRow(
        { ...(edit as Row), id },
        headerData,
        indexPopulation
      );
    }

    return rows;
  }, [data, headerData, edits, indexPopulation, t]);

  const setDraft = useCallback((patch: RecordPatch<Row>) => {
    setEdits(prev => ({
      ...prev,
      [patch.id]: { ...prev[patch.id], ...patch },
    }));
  }, []);

  const addRow = useCallback((row: Row) => {
    setEdits(prev => ({
      ...prev,
      [row.id]: { ...row, isNew: true },
    }));
  }, []);

  const resetEdits = useCallback(() => setEdits({}), []);

  return {
    draft,
    indexPopulation,
    setDraft,
    addRow,
    resetEdits,
    isLoading,
    data,
  };
};
