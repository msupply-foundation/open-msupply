import { useMutation } from '@tanstack/react-query';
import { useDemographicsApi } from '../utils/useDemographicApi';
import { UpdateDemographicIndicatorInput } from '@common/types';

export const useDemographicIndicatorUpdate = () => {
  const api = useDemographicsApi();

  return useMutation({
    mutationFn: async (demographicIndicator: UpdateDemographicIndicatorInput) =>
      await api.updateIndicator(demographicIndicator),
    onError: () => {},
  });
};
