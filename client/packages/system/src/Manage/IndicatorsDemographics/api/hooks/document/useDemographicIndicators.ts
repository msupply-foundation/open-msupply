import {
  useUrlQueryParams,
  useQuery,
  useTranslation,
  ArrayUtils,
} from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';
import { useEffect, useState } from 'react';
import { GENERAL_POPULATION_ID } from '../..';
import {
  calculateAcrossRow,
  toDemographicIndicatorRow,
} from '../../../DetailView/utils';
import { HeaderData, Row } from '../../../types';

export const useDemographicIndicators = (headerData?: HeaderData) => {
  const t = useTranslation();
  const api = useDemographicsApi();
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const { queryParams } = useUrlQueryParams({
    filters: [{ key: 'name' }, { key: 'basePopulation' }, { key: 'id' }],
  });
  const { data, isLoading } = useQuery(
    api.keys.paramIndicatorList(queryParams),
    () => api.getIndicators.list(queryParams)
  );

  // initial load which populates from the API
  useEffect(() => {
    if (!data || !headerData) return;

    const nodesAsRow = data.nodes.map(node =>
      toDemographicIndicatorRow({
        ...node,
        // Always use the translated name for the general population row since
        // it wasn't added by the user and is hardcoded in En
        name:
          node.id === GENERAL_POPULATION_ID
            ? t('label.general-population')
            : node.name,
      })
    );
    const draftRows = ArrayUtils.toObject(nodesAsRow) as Record<string, Row>;
    setDraft(draftRows);

    // don't want this changing every time the draft updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, headerData]);

  // recalculate the draft when the header changes
  useEffect(() => {
    const generalRow = draft[GENERAL_POPULATION_ID];
    if (!generalRow || !headerData) return;

    const updatedDraft: Record<string, Row> = {};
    Object.values(draft).forEach(row => {
      const updatedRow = calculateAcrossRow(
        row,
        headerData,
        generalRow.basePopulation
      );
      updatedDraft[updatedRow.id] = updatedRow;
    });

    setDraft(updatedDraft);
    // don't want to update on every draft change::recursion!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, headerData]);

  return { draft, setDraft, isLoading, data };
};
