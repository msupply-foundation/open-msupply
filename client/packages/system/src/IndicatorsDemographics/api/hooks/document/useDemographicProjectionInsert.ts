import { useMutation, useQueryClient } from 'react-query';
import { DemographicProjectionFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjectionInsert = () => {
  const queryClient = useQueryClient();
  const api = useDemographicsApi();

  const invalidateQueries = () =>
    queryClient.invalidateQueries(api.keys.baseProjection());
  const { mutateAsync: insertDemographicProjection } = useMutation(
    async (demographicProjection: DemographicProjectionFragment) =>
      api.insertProjection(demographicProjection),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.baseProjection()),
      onError: e => {
        console.error(e);
      },
    }
  );

  return { insertDemographicProjection, invalidateQueries };
};
