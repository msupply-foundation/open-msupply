import { useQuery } from '@openmsupply-client/common';
import { useReturnReasonGraphQL } from '../useReturnReasonGraphQL';

const RETURN_REASON = 'return_reason';

export const useReturnReasons = () => {
  const { returnReasonApi } = useReturnReasonGraphQL();

  const queryKey = [RETURN_REASON];

  const queryFn = async () => {
    const query = await returnReasonApi.returnReasons({
      filter: { isActive: true },
    });
    return query?.returnReasons;
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
