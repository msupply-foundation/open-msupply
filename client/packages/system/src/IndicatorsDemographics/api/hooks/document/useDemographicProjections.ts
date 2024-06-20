import { useQuery } from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjections = (baseYear: number) => {
  const api = useDemographicsApi();
  const params = {
    filterBy: { baseYear: { equalTo: baseYear } },
    first: 5,
    offset: 0,
  };
  return useQuery(api.keys.paramProjectionList(baseYear), async () => {
    const result = await api.getProjections.list(params);

    return result.totalCount === 0
      ? {
          nodes: [
            {
              __typename: 'DemographicProjectionNode',
              baseYear: baseYear,
              id: '',
              year1: 0,
              year2: 0,
              year3: 0,
              year4: 0,
              year5: 0,
            },
          ],
        }
      : result;
  });
};
