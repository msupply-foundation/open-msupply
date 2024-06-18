import { useMutation } from 'react-query';
import { DemographicProjectionFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjectionUpdate = () => {
  const api = useDemographicsApi();

  return useMutation(
    async (
      demographicProjection: Omit<DemographicProjectionFragment, '__typename'>
    ) => api.updateProjection(demographicProjection)
  );
};
