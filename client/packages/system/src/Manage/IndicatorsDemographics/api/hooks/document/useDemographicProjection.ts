import { useQuery } from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjection = (baseYear: number) => {
  const api = useDemographicsApi();
  return useQuery({
    queryKey: api.keys.projection(baseYear),

    queryFn: async () => {
      const result = await api.getProjections.byBaseYear(baseYear);

      return (
        result ?? {
          __typename: 'DemographicProjectionNode' as const,
          baseYear: baseYear,
          id: '',
          year1: 0,
          year2: 0,
          year3: 0,
          year4: 0,
          year5: 0,
        }
      );
    }
  });
};
