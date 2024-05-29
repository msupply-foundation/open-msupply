import { useParams, useQuery } from '@openmsupply-client/common';

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
  const api = useDemographicIndicatorApi();
  return useQuery(
    api.keys.detail(demographicIndicatorId || ''),
    () => api.get.demographicIndicatorById(demographicIndicatorId || ''),
    {
      enabled: !!demographicIndicatorId,
    }
  );
};
