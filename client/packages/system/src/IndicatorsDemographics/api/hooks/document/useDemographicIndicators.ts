import {
  useUrlQueryParams,
  useQuery,
  useTranslation,
  DemographicIndicatorNode,
  uniqBy,
  ArrayUtils,
} from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';
import { toRow } from '../../../DetailView/IndicatorsDemographics';
import { useEffect, useState } from 'react';
import { GENERAL_POPULATION_ID } from '../..';
import { calculateAcrossRow } from '../../../DetailView/utils';
import { HeaderData, Row } from '../../../types';

export const useDemographicIndicators = (headerData?: HeaderData) => {
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
    if (!data || !headerData) {
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
      // later we could save generalPopulationRows in the database which are unique for any given year? Their id could be something
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
      headerData,
      generalRow.basePopulation
    );
    if (!generalRowCalculated) return;

    const nodes = [...data?.nodes];
    const nodesAsRow = nodes.map(row => toRow(row));
    const nodesFiltered = uniqBy([generalRowCalculated, ...nodesAsRow], 'id');
    const draftRows = ArrayUtils.toObject(nodesFiltered);
    setDraft(draftRows);
  }, [data, headerData, t]);

  return { draft, setDraft, isLoading };
};
