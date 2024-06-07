import { useMutation, useQueryClient } from 'react-query';
import { DemographicIndicatorFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicIndicatorUpdate = () => {
  const queryClient = useQueryClient();
  const api = useDemographicsApi();

  return useMutation(
    async (demographicIndicator: DemographicIndicatorFragment) =>
      api.updateIndicator(demographicIndicator),
    { onSettled: () => queryClient.invalidateQueries(api.keys.baseIndicator()) }
  );
};
