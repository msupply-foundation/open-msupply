import { useUrlQueryParams, useQuery } from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicIndicators = () => {
  const { queryParams } = useUrlQueryParams({
    filters: [{ key: 'name' }, { key: 'basePopulation' }, { key: 'id' }],
  });
  const api = useDemographicsApi();
  const filterBy = queryParams.filterBy;
  const params = { ...queryParams, filterBy };
  return useQuery(api.keys.paramIndicatorList(params), () =>
    api.getIndicators.list(params)
  );
};
