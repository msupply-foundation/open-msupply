import { useQuery } from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjections = (baseYear: number) => {
  const api = useDemographicsApi();
  const params = {
    filterBy: { baseYear: { equalTo: baseYear } },
    first: 5,
    offset: 0,
  };
  return useQuery(api.keys.paramProjectionList(baseYear), () =>
    api.getProjections.list(params)
  );
};
