import { useUrlQueryParams, useQuery } from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';
import { useState } from 'react';
import { Row } from '../../../types';

export const useDemographics = () => {
  const api = useDemographicsApi();
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const { queryParams } = useUrlQueryParams({
    filters: [{ key: 'name' }, { key: 'basePopulation' }, { key: 'id' }],
  });
  const { data, isLoading } = useQuery(
    api.keys.paramDemographicList(queryParams),
    () => api.getDemographics.list(queryParams)
  );

  return { draft, setDraft, isLoading, data };
};
