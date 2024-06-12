import {
  useUrlQueryParams,
  useQuery,
  useTranslation,
  DemographicIndicatorNode,
  uniqBy,
  ArrayUtils,
} from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';
import {
  HeaderValue,
  Row,
  toRow,
} from '../../../DetailView/IndicatorsDemographics';
import { useEffect, useState } from 'react';
import { GENERAL_POPULATION_ID } from '../..';
import { calculateAcrossRow } from '../../../DetailView/utils';

export const useDemographicIndicators = (headerData?: HeaderValue[]) => {
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

    // TODO refactor hook to remove useEffect / make headerData not required so hook useable elsewhere

    if (!headerData) {
      return;
    }

    // generate index row dynamically from basePopulation and baseYear
    const generalRow: DemographicIndicatorNode = {
      __typename: 'DemographicIndicatorNode',
      id: GENERAL_POPULATION_ID,
      populationPercentage: 100,
      name: t('label.general-population'),
      baseYear: data?.nodes[0]?.baseYear ?? 2024,
      // calculate basePopulation based on first matching row's base population
      // later we could save generalPopulationRows in the database which are unique for anygivenyear? Their id could be something
      // like GENERAL_POPULATION_ID_<year>
      basePopulation: data?.nodes[0]?.basePopulation ?? 0,
      year1Projection: data?.nodes[0]?.basePopulation ?? 0,
      year2Projection: 0,
      year3Projection: 0,
      year4Projection: 0,
      year5Projection: 0,
    };

    const generalRowCalculated = calculateAcrossRow(
      toRow(generalRow),
      ArrayUtils.toObject(headerData),
      generalRow.basePopulation
    );

    const nodes = [...data?.nodes];
    const nodesAsRow = nodes.map(row => toRow(row));
    const nodesFiltered = uniqBy([generalRowCalculated, ...nodesAsRow], 'id');
    const draftRows = ArrayUtils.toObject(nodesFiltered);
    setDraft(draftRows);
  }, [data, t]);

  return { draft, setDraft, isLoading, data };
};
