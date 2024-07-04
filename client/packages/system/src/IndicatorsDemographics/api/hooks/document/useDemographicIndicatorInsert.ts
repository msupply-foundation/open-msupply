import { useMutation, useQueryClient } from 'react-query';
import { useDemographicsApi } from '../utils/useDemographicApi';
import { InsertDemographicIndicatorInput } from '@common/types';

export const useDemographicIndicatorInsert = () => {
  const queryClient = useQueryClient();
  const api = useDemographicsApi();

  const invalidateQueries = () =>
    queryClient.invalidateQueries(api.keys.baseIndicator());
  const { mutateAsync: insertDemographicIndicator } = useMutation(
    async (demographicIndicator: InsertDemographicIndicatorInput) =>
      await api.insertIndicator(demographicIndicator),
    {
      onError: () => {},
    }
  );

  return { insertDemographicIndicator, invalidateQueries };
};
