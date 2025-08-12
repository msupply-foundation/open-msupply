import {
  RecordPatch,
  useMutation,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useGoodsReceivedGraphQL } from '../useGoodsReceivedGraphQL';
import { GOODS_RECEIVED, LIST } from './keys';
import { GoodsReceivedFragment } from '../operations.generated';
import { parseUpdateInput } from './utils';

export const useGoodsReceived = () => {
  const { goodsReceivedId } = useParams();

  // QUERY
  const { data, isLoading, isError } = useGetById(goodsReceivedId);

  // UPDATE
  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

  const update = async (input: Partial<GoodsReceivedFragment>) => {
    if (!goodsReceivedId) return;
    const result = await updateMutation({ id: goodsReceivedId, ...input });
    return result;
  };

  return {
    query: { data, isLoading, isError },
    update: { update, isUpdating, updateError },
  };
};

const useGetById = (id?: string) => {
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

const useUpdate = () => {
  const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();

  const mutationFn = async (input: RecordPatch<GoodsReceivedFragment>) => {
    return await goodsReceivedApi.updateGoodsReceived({
      input: parseUpdateInput(input),
      storeId,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [GOODS_RECEIVED, LIST] }),
  });
};
