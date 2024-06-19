import {
  useUrlQueryParams,
  useQuery,
  useTranslation,
  uniqBy,
  ArrayUtils,
  TypedTFunction,
  LocaleKey,
} from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';
import { useEffect, useState } from 'react';
import { GENERAL_POPULATION_ID } from '../..';
import {
  calculateAcrossRow,
  toDemographicIndicatorRow,
} from '../../../DetailView/utils';
import { HeaderData, Row } from '../../../types';
import { DemographicIndicatorFragment } from '../../operations.generated';

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

    const generalRow = getGeneralRow(draft, data?.nodes ?? [], headerData, t);
    const nodes = [...data?.nodes];
    const nodesAsRow = nodes.map(toDemographicIndicatorRow);
    const nodesFiltered = uniqBy([generalRow, ...nodesAsRow], 'id');
    const draftRows = ArrayUtils.toObject(nodesFiltered);
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

const getGeneralRow = (
  draft: Record<string, Row>,
  nodes: DemographicIndicatorFragment[],
  headerData: HeaderData,
  t: TypedTFunction<LocaleKey>
) => {
  const draftGeneralRow = draft[GENERAL_POPULATION_ID];
  if (!!draftGeneralRow) return draftGeneralRow;

  // generate index row dynamically from basePopulation and baseYear
  const generalRow = toDemographicIndicatorRow({
    __typename: 'DemographicIndicatorNode',
    id: GENERAL_POPULATION_ID,
    populationPercentage: 100,
    name: t('label.general-population'),
    baseYear: nodes[0]?.baseYear ?? 2024,
    // calculate basePopulation based on first matching row's base population
    // later we could save generalPopulationRows in the database which are unique for any given year? Their id could be something
    // like GENERAL_POPULATION_ID_<year>
    basePopulation: nodes[0]?.basePopulation ?? 0,
    year1Projection: nodes[0]?.basePopulation ?? 0,
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

  return generalRowCalculated;
};
