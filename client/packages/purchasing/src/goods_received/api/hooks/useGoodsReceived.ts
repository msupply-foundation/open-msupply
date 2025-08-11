import {
  FnUtils,
  useMutation,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useGoodsReceivedGraphQL } from '../useGoodsReceivedGraphQL';
import { GOODS_RECEIVED } from './keys';

export interface InsertGoodsReceivedInput {
  id: string;
  purchaseOrderId: string;
}

export const useGoodsReceived = () => {
  const { goodsReceivedApi: _goodsReceivedApi, storeId: _storeId, queryClient: _queryClient } = useGoodsReceivedGraphQL();
  const { error } = useNotification();
  const t = useTranslation();

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (purchaseOrderId: string) => {
    const id = FnUtils.generateUUID();
    try {
      const result = await createMutation({ id, purchaseOrderId });
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
  const { goodsReceivedApi: _goodsReceivedApi, storeId: _storeId, queryClient } = useGoodsReceivedGraphQL();

  const mutationFn = async (input: InsertGoodsReceivedInput) => {
    // TODO: Replace with actual GraphQL mutation when backend is implemented
    // For now, simulate a successful response
    // eslint-disable-next-line no-console
    console.log('Creating goods received with input:', input);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return a mock response that matches the expected GraphQL response structure
    return {
      insertGoodsReceived: {
        __typename: 'IdResponse' as const,
        id: input.id,
      },
    };
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([GOODS_RECEIVED]),
  });
};
