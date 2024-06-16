import { useMutation } from 'react-query';
import { DemographicIndicatorFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicIndicatorUpdate = () => {
  const api = useDemographicsApi();

  return useMutation(
    async (demographicIndicator: DemographicIndicatorFragment) =>
      await api.updateIndicator(demographicIndicator)
  );
};
