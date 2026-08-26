import { useMutation } from '@tanstack/react-query';
import { DemographicProjectionFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjectionInsert = () => {
  const api = useDemographicsApi();

  return useMutation({
    mutationFn: async (
      demographicProjection: Omit<DemographicProjectionFragment, '__typename'>
    ) => await api.insertProjection(demographicProjection),
    onError: (e: unknown) => console.error(e),
  });
};
