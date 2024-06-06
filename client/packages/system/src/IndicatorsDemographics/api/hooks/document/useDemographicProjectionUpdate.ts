import { useMutation, useQueryClient } from 'react-query';
import { DemographicProjectionFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjectionUpdate = () => {
  const queryClient = useQueryClient();
  const api = useDemographicsApi();

  return useMutation(
    async (demographicProjection: DemographicProjectionFragment) =>
      api.updateProjection(demographicProjection),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.baseProjection()),
    }
  );
};
