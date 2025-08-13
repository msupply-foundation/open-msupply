import {
  // UpdateGoodsReceivedLineInput,
  useMutation,
  // useNotification,
  usePatchState,
  useQuery,
  // useTranslation,
} from '@openmsupply-client/common/src';
import { useGoodsReceivedGraphQL } from '../useGoodsReceivedGraphQL';
import { GOODS_RECEIVED_LINE } from './keys';
import { GoodsReceivedLineFragment } from '../operations.generated';

export type DraftGoodsReceivedLine = Omit<
  GoodsReceivedLineFragment,
  '__typename' | 'item'
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

  // UPDATE
  // const {
  //   updateGoodsReceivedLine,
  //   isLoading: isUpdating,
  //   error: updateError,
  // } = useUpdate();

  // const update = async () => {
  //   const input: UpdateGoodsReceivedLineInput = {
  //     id: draft.id,
  //     itemId: draft.itemId,
  //   };
  //   return await updateGoodsReceivedLine(input);
  // };

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

  return {
    query: { data: data?.nodes[0], isLoading, error },
    create: { create, isCreating, createError },
    // update: { update, isUpdating, updateError },
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

    if (result.goodsReceivedLines.__typename === 'GoodsReceivedLineConnector') {
      return result.goodsReceivedLines;
    }
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

// const useUpdate = () => {
//   const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();
//   const t = useTranslation();
//   const { error } = useNotification();

//   const mutationState = useMutation(goodsReceivedApi.updateGoodsReceivedLine);

//   const updateGoodsReceivedLine = async (
//     input: UpdateGoodsReceivedLineInput
//   ) => {
//     try {
//       const result = await goodsReceivedApi.updateGoodsReceivedLine({
//         storeId,
//         input: {
//           ...input,
//         },
//       });
//       if (
//         result.updateGoodsReceivedLine.__typename ===
//         'UpdateGoodsReceivedLineError'
//       ) {
//         const errorType = result.updateGoodsReceivedLine.error.__typename;
//         switch (errorType) {
//           case 'CannotEditGoodsReceived':
//             return error(t('label.cannot-edit-purchase-order'))();
//           case 'GoodsReceivedDoesNotExist':
//             return error(t('label.purchase-order-does-not-exist'))();
//           case 'GoodsReceivedLineNotFound':
//             return error(t('label.purchase-order-line-not-found'))();
//           case 'UpdatedLineDoesNotExist':
//             return error(t('label.updated-line-does-not-exist'))();
//           default:
//             return error(t('label.cannot-update-purchase-order-line'))();
//         }
//       }
//       queryClient.invalidateQueries([GOODS_RECEIVED]);
//     } catch (e) {
//       console.error('Error updating purchase order line:', e);
//       return error(t('label.cannot-update-purchase-order-line'))();
//     }
//   };

//   return { ...mutationState, updateGoodsReceivedLine };
// };
