import { useMutation } from '@tanstack/react-query';
import { DemographicProjectionFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjectionUpdate = () => {
  const api = useDemographicsApi();

  return useMutation({
    mutationFn: async (
      demographicProjection: Omit<DemographicProjectionFragment, '__typename'>
    ) => api.updateProjection(demographicProjection),
  });
};
