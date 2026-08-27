import { FilterBy, useQuery } from '@openmsupply-client/common';
import { useShippingMethodGraphQL } from '../useShippingMethodGraphQL';
import { SHIPPING_METHOD } from './keys';

export function useShippingMethod(filterBy?: FilterBy) {
  const { shippingMethodApi, storeId } = useShippingMethodGraphQL();

  const queryKey = [SHIPPING_METHOD, storeId];
  const queryFn = async () => {
    const query = await shippingMethodApi.shippingMethods({
      storeId,
      filter: filterBy,
    });

    const { nodes, totalCount } = query?.shippingMethods;
    return { nodes, totalCount };
  };

  return useQuery({
    queryKey,
    queryFn,
  });
}
