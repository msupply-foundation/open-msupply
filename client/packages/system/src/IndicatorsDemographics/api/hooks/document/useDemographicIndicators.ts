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
import { calculateAcrossRow } from '../../../DetailView/utils';
import { useDemographicProjections } from './useDemographicProjections';
import { DemographicProjectionFragment } from '../../operations.generated';

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
  const { data: projections } = useDemographicProjections(
    draft?.[0]?.baseYear ?? 2024
  );
  const headerData = mapHeaderData(projections?.nodes);

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

    const nodes = [...data?.nodes];
    const nodesAsRow = nodes.map(row => toRow(row));
    const nodesFiltered = uniqBy([generalRowCalculated, ...nodesAsRow], 'id');
    const draftRows = ArrayUtils.toObject(nodesFiltered);
    setDraft(draftRows);
  }, [data, headerData, t]);

  return { draft, setDraft, isLoading, headerData };
};

const defaultHeaderData = {
  '1': { id: '1', value: 1 },
  '2': { id: '2', value: 1 },
  '3': { id: '3', value: 1 },
  '4': { id: '4', value: 1 },
  '5': { id: '5', value: 1 },
};

const mapHeaderData = (headerData?: DemographicProjectionFragment[]) => {
  if (!headerData) return defaultHeaderData;
  if (!headerData[0]) return defaultHeaderData;
  return {
    '1': { id: '1', value: headerData[0].year1 },
    '2': { id: '2', value: headerData[0].year2 },
    '3': { id: '3', value: headerData[0].year3 },
    '4': { id: '4', value: headerData[0].year4 },
    '5': { id: '5', value: headerData[0].year5 },
  };
};
