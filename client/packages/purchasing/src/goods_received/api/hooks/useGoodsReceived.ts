import {
  FnUtils,
  useMutation,
  useNotification,
  useTranslation,
  InsertGoodsReceivedInput,
} from '@openmsupply-client/common';
import { useGoodsReceivedGraphQL } from '../useGoodsReceivedGraphQL';
import { GOODS_RECEIVED } from './keys';

export const useGoodsReceived = () => {
  const { error } = useNotification();
  const t = useTranslation();

  // QUERY
  const { data, isLoading, isError } = useGetById(goodsReceivedId);

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (purchaseOrderId: string) => {
    const id = FnUtils.generateUUID();
    try {
      const result = await createMutation({
        id,
        purchaseOrderId,
      });
      return result;
    } catch (e) {
      console.error('Error creating goods received:', e);
      const errorSnack = error(
        `${t('error.failed-to-create-goods-received')} ${(e as Error).message}`
      );
      errorSnack();
      throw e;
    }
  };

  return {
    create: { create, isCreating, createError },
  };
};

const useCreate = () => {
  const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();

  const mutationFn = async (input: InsertGoodsReceivedInput) => {
    return await goodsReceivedApi.insertGoodsReceived({
      input,
      storeId,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([GOODS_RECEIVED]),
  });
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
