import {
  useUrlQueryParams,
  useQuery,
  useTranslation,
  DemographicIndicatorNode,
  uniqBy,
  ArrayUtils,
} from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';
import { Row, toRow } from '../../../DetailView/IndicatorsDemographics';
import { useEffect, useMemo, useState } from 'react';

export const useDemographicIndicators = () => {
  const t = useTranslation();

  const { queryParams } = useUrlQueryParams({
    filters: [{ key: 'name' }, { key: 'basePopulation' }, { key: 'id' }],
  });

  const api = useDemographicsApi();
  const filterBy = queryParams.filterBy;
  const params = { ...queryParams, filterBy };
  const { data, isLoading } = useQuery(
    api.keys.paramIndicatorList(params),
    () => api.getIndicators.list(params)
  );

  // generate index row dynamically from basePopulation and baseYear
  const generalRow: DemographicIndicatorNode = useMemo(() => {
    return {
      __typename: 'DemographicIndicatorNode',
      id: 'generalRow',
      populationPercentage: 100,
      name: t('label.general-population'),
      baseYear: data?.nodes.pop()?.baseYear ?? 2024,
      basePopulation: data?.nodes.pop()?.basePopulation ?? 0,
      year1Projection: 0,
      year2Projection: 0,
      year3Projection: 0,
      year4Projection: 0,
      year5Projection: 0,
    };
  }, [data?.nodes, t]);

  const [draft, setDraft] = useState<Record<string, Row>>({});

  useEffect(() => {
    if (!data) {
      return;
    }
    const nodes = uniqBy([...data?.nodes, generalRow], 'id');
    const nodesAsRow = nodes.map(row => toRow(row));
    const draftRows = ArrayUtils.toObject(nodesAsRow);
    setDraft(draftRows);
  }, [data, generalRow]);

  return { draft, setDraft, isLoading };
};
