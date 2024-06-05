import { useParams, useQuery } from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjectionId = () => {
  const { id = '' } = useParams();
  return id;
};
export const useDemographicProjection = () => {
  const demographicProjectionId = useDemographicProjectionId();
  return useDemographicProjectionById(demographicProjectionId);
};

export const useDemographicProjectionById = (
  demographicProjectionId: string | undefined
) => {
  const api = useDemographicsApi();
  return useQuery(
    api.keys.detailProjection(demographicProjectionId || ''),
    () => api.getProjections.byId(demographicProjectionId || ''),
    {
      enabled: !!demographicProjectionId,
    }
  );
};
