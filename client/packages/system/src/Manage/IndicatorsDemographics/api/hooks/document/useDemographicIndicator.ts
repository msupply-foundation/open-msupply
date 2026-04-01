import { useParams, useQuery } from '@openmsupply-client/common';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicIndicatorId = () => {
  const { id = '' } = useParams();
  return id;
};
export const useDemographicIndicator = () => {
  const demographicIndicatorId = useDemographicIndicatorId();
  return useDemographicIndicatorById(demographicIndicatorId);
};

export const useDemographicIndicatorById = (
  demographicIndicatorId: string | undefined
) => {
  const api = useDemographicsApi();
  return useQuery({
    queryKey: api.keys.detailIndicator(demographicIndicatorId || ''),
    queryFn: () => api.getIndicators.byId(demographicIndicatorId || ''),
    enabled: !!demographicIndicatorId
  });
};
