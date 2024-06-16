import { useMutation } from 'react-query';
import { DemographicProjectionFragment } from '../../operations.generated';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjectionInsert = () => {
  const api = useDemographicsApi();

  return useMutation(
    async (
      demographicProjection: Omit<DemographicProjectionFragment, '__typename'>
    ) => await api.insertProjection(demographicProjection),
    { onError: e => console.error(e) }
  );
};
