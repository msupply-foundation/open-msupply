import { useMutation, useQueryClient } from 'react-query';
import { DemographicIndicatorFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicIndicatorInsert = () => {
  const queryClient = useQueryClient();
  const api = useDemographicsApi();

  const invalidateQueries = () =>
    queryClient.invalidateQueries(api.keys.baseIndicator());
  const { mutateAsync: insertDemographicIndicator } = useMutation(
    async (demographicIndicator: DemographicIndicatorFragment) =>
      await api.insertIndicator(demographicIndicator)
  );

  return { insertDemographicIndicator, invalidateQueries };
};
