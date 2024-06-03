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
import { useEffect, useState } from 'react';
import { GENERAL_POPULATION_ID } from '../..';

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

  const [draft, setDraft] = useState<Record<string, Row>>({});

  useEffect(() => {
    if (!data) {
      return;
    }
    // generate index row dynamically from basePopulation and baseYear
    const generalRow: DemographicIndicatorNode = {
      __typename: 'DemographicIndicatorNode',
      id: GENERAL_POPULATION_ID,
      populationPercentage: 100,
      name: t('label.general-population'),
      baseYear: data?.nodes[0]?.baseYear ?? 2024,
      basePopulation: data?.nodes[0]?.basePopulation ?? 0,
      year1Projection: 0,
      year2Projection: 0,
      year3Projection: 0,
      year4Projection: 0,
      year5Projection: 0,
    };
    const nodes = uniqBy([generalRow, ...data?.nodes], 'id');
    const nodesAsRow = nodes.map(row => toRow(row));
    const draftRows = ArrayUtils.toObject(nodesAsRow);
    setDraft(draftRows);
  }, [data, t]);

  return { draft, setDraft, isLoading };
};
