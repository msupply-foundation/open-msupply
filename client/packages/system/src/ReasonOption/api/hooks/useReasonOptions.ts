import { useQuery } from '@openmsupply-client/common';
import { useReasonOptionsGraphQL } from '../useReasonOptionGraphQL';

const REASON_OPTIONS = 'reason_options';

export const useReasonOptions = () => {
  const { reasonOptionsApi } = useReasonOptionsGraphQL();

  const queryKey = [REASON_OPTIONS];

  const queryFn = async () => {
    const query = await reasonOptionsApi.reasonOptions({
      filter: { isActive: true },
    });
    return query?.reasonOptions;
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
