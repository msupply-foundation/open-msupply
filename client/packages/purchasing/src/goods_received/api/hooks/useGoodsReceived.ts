import { useParams, useQuery } from '@openmsupply-client/common';
import { useGoodsReceivedGraphQL } from '../useGoodsReceivedGraphQL';
import { GOODS_RECEIVED, LIST } from './keys';

export const useGoodsReceived = () => {
  const { goodsReceivedId } = useParams();

  // QUERY
  const { data, isLoading, isError } = useGetById(goodsReceivedId);

  return {
    query: { data, isLoading, isError },
  };
};

export const useGetById = (id?: string) => {
  const { goodsReceivedApi, storeId } = useGoodsReceivedGraphQL();

  const queryKey = [GOODS_RECEIVED, LIST, storeId];

  const queryFn = async () => {
    if (!id) return;

    const result = await goodsReceivedApi.goodsReceivedById({
      id,
      storeId,
    });

    if (result?.goodsReceived.__typename === 'GoodsReceivedNode') {
      return result.goodsReceived;
    } else {
      console.error('No goods received found', id);
      throw new Error(`Could not find goods received ${id}`);
    }
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!id,
  });
};
