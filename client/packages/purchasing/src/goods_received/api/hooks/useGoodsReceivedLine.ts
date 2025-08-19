import {
  InsertGoodsReceivedLinesFromPurchaseOrderInput,
  SaveGoodsReceivedLinesInput,
  useMutation,
  usePatchState,
  useQuery,
} from '@openmsupply-client/common/src';
import { useGoodsReceivedGraphQL } from '../useGoodsReceivedGraphQL';
import { GOODS_RECEIVED_LINE } from './keys';
import { GoodsReceivedLineFragment } from '../operations.generated';

export type DraftGoodsReceivedLine = Omit<
  GoodsReceivedLineFragment,
  | '__typename'
  | 'item'
  | 'lineNumber'
  | 'receivedPackSize'
  | 'numberOfPacksReceived'
> & {
  goodsReceivedId: string;
  purchaseOrderLineId: string;
  itemId: string;
};

export type DraftGoodsReceivedLineFromCSV = Omit<
  DraftGoodsReceivedLine,
  'id' | 'itemId'
> & {
  itemCode: string;
};

const defaultGoodsReceivedLine: DraftGoodsReceivedLine = {
  id: '',
  goodsReceivedId: '',
  purchaseOrderLineId: '',
  itemId: '',
  batch: '',
  comment: '',
  lineNumber: 0,
  expiryDate: null,
  manufacturerLinkId: '',
  numberOfPacksReceived: 0,
  receivedPackSize: 0,
  item: {
    __typename: 'ItemNode',
    id: '',
    name: '',
  },
};

export function useGoodsReceivedLine(id?: string) {
  const { data, isLoading, error } = useGet(id ?? '');

  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<DraftGoodsReceivedLine>(data?.nodes[0] ?? {});

  const draft: DraftGoodsReceivedLine = data
    ? {
        ...defaultGoodsReceivedLine,
        ...data?.nodes[0],
        itemId: data?.nodes[0]?.item.id ?? '',
        ...patch,
      }
    : { ...defaultGoodsReceivedLine, ...patch, itemId: '' };

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (input?: DraftGoodsReceivedLine) => {
    if (input) return await createMutation(input);
    return await createMutation(draft);
  };

  // CREATE LINES FROM PURCHASE ORDER
  const {
    mutateAsync: createLinesFromPurchaseOrderMutation,
    isLoading: isCreatingLinesFromPurchaseOrder,
    error: createLinesFromPurchaseOrderError,
  } = useCreateGoodsReceivedLinesFromPurchaseOrder();

  const createLinesFromPurchaseOrder = async (
    input: InsertGoodsReceivedLinesFromPurchaseOrderInput
  ) => {
    return await createLinesFromPurchaseOrderMutation(input);
  };

  // UPDATE
  // TODO: Implement update functionality

  // Save Goods Received Lines
  const {
    mutateAsync: saveGoodsReceivedLinesMutation,
    isLoading: isSaving,
    error: saveError,
  } = useSaveGoodsReceivedLines();

  const saveGoodsReceivedLines = async (input: SaveGoodsReceivedLinesInput) => {
    return await saveGoodsReceivedLinesMutation(input);
  };

  return {
    query: { data: data?.nodes[0], isLoading, error },
    create: { create, isCreating, createError },
    createLinesFromPurchaseOrder: {
      createLinesFromPurchaseOrder,
      isCreatingLinesFromPurchaseOrder,
      createLinesFromPurchaseOrderError,
    },
    saveGoodsReceivedLines: {
      saveGoodsReceivedLines,
      isSaving,
      saveError,
    },
    draft,
    resetDraft,
    isDirty,
    updatePatch,
  };
}

const useGet = (id: string) => {
  const { goodsReceivedApi, storeId } = useGoodsReceivedGraphQL();

  const queryFn = async () => {
    const result = await goodsReceivedApi.goodsReceivedLine({
      id,
      storeId,
    });

    if (result.goodsReceivedLines.__typename === 'GoodsReceivedLineConnector')
      return result.goodsReceivedLines;
  };

  const query = useQuery({
    queryKey: [GOODS_RECEIVED_LINE, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};

const useCreate = () => {
  const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();

  const mutationFn = async (draft: DraftGoodsReceivedLine) => {
    return await goodsReceivedApi.insertGoodsReceivedLine({
      storeId,
      input: {
        id: draft.id,
        goodsReceivedId: draft.goodsReceivedId,
        purchaseOrderLineId: draft.purchaseOrderLineId,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([GOODS_RECEIVED_LINE]),
  });
};

const useCreateGoodsReceivedLinesFromPurchaseOrder = () => {
  const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();

  const mutationFn = async (
    input: InsertGoodsReceivedLinesFromPurchaseOrderInput
  ) => {
    return await goodsReceivedApi.insertGoodsReceivedLinesFromPurchaseOrder({
      storeId,
      input,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([GOODS_RECEIVED_LINE]),
  });
};

const useSaveGoodsReceivedLines = () => {
  const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();

  const mutationFn = async (input: SaveGoodsReceivedLinesInput) => {
    return await goodsReceivedApi.saveGoodsReceivedLines({
      storeId,
      input,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([GOODS_RECEIVED_LINE]),
  });
};
