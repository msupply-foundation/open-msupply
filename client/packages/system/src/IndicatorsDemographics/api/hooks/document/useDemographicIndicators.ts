import {
  useUrlQueryParams,
  useQuery,
  useTranslation,
  uniqBy,
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

  // initial load which populates from the API
  useEffect(() => {
    const isDraftPopulated = Object.keys(draft).length > 0;
    if (!data || !headerData || isDraftPopulated) {
      return;
    }

    // generate index row dynamically from basePopulation and baseYear
    const generalRow = toDemographicIndicatorRow({
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
    });

    const generalRowCalculated = calculateAcrossRow(
      generalRow,
      headerData,
      generalRow.basePopulation
    );

    const nodes = [...data?.nodes];
    const nodesAsRow = nodes.map(toDemographicIndicatorRow);
    const nodesFiltered = uniqBy([generalRowCalculated, ...nodesAsRow], 'id');
    const draftRows = ArrayUtils.toObject(nodesFiltered);
    setDraft(draftRows);

    // don't want this changing every time the draft updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, t, headerData]);

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
