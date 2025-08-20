import {
  FnUtils,
  useMutation,
  useNotification,
  useTranslation,
  InsertGoodsReceivedInput,
  useParams,
  LIST_KEY,
  useQuery,
  RecordPatch,
  SortUtils,
  useUrlQuery,
} from '@openmsupply-client/common';
import { useGoodsReceivedGraphQL } from '../useGoodsReceivedGraphQL';
import { GOODS_RECEIVED } from './keys';
import { parseUpdateInput } from './utils';
import { GoodsReceivedFragment } from '../operations.generated';
import { useMemo } from 'react';
import { useGoodsReceivedColumns } from '../../DetailView/columns';

export const useGoodsReceived = () => {
  const t = useTranslation();
  const { error } = useNotification();
  const { goodsReceivedId } = useParams();

  // QUERY
  const { data, isLoading, isError } = useGetById(goodsReceivedId);

  const { sortedAndFilteredLines, itemFilter, setItemFilter } =
    useFilteredAndSortedLines(data);

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
    create: { create, isCreating, createError },
    lines: { sortedAndFilteredLines, itemFilter, setItemFilter },
    update: { update, isUpdating, updateError },
  };
};

const useGetById = (id?: string) => {
  const { goodsReceivedApi, storeId } = useGoodsReceivedGraphQL();

  const queryKey = [GOODS_RECEIVED, LIST_KEY, storeId];

  const queryFn = async () => {
    if (!id) return;
    const result = await goodsReceivedApi.goodsReceivedById({
      id,
      storeId,
    });

    if (result?.goodsReceived.__typename === 'GoodsReceivedNode') {
      return result.goodsReceived;
    } else {
      console.error('No goods received found', id, result);
      throw new Error(`Could not find goods received ${id}`);
    }
  };

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!id,
  });
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

const useUpdate = () => {
  const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();
  const { error, success } = useNotification();
  const t = useTranslation();
  const mutationFn = async (input: RecordPatch<GoodsReceivedFragment>) => {
    try {
      const result = await goodsReceivedApi.updateGoodsReceived({
        input: parseUpdateInput(input),
        storeId,
      });
      if (
        result.updateGoodsReceived.__typename === 'UpdateGoodsReceivedError'
      ) {
        const errorType = result.updateGoodsReceived.error.__typename;
        switch (errorType) {
          case 'GoodsReceivedEmpty':
            return error(t('error.goods-received-empty'))();
          case 'PurchaseOrderNotFinalised':
            return error(t('error.purchase-order-not-finalised'))();
          case 'NoAuthorisedLines':
            return error(t('error.no-authorised-lines'))();
          default:
            return error(t('error.cannot-update-goods-received'))();
        }
      } else if (result.updateGoodsReceived.__typename === 'IdResponse') {
        // handle successful update
        success(t('messages.goods-received-saved'))();
      }
    } catch (e) {
      console.error('Error updating goods received:', e);
      error(t('error.cannot-update-goods-received'))();
      // swallow error here as have already handled error ui
    }
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [GOODS_RECEIVED] }),
  });
};

const useFilteredAndSortedLines = (
  data: GoodsReceivedFragment | undefined | void
) => {
  const { columns, sortBy } = useGoodsReceivedColumns();

  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['codeOrName'],
  });

  const itemFilter = urlQuery?.['codeOrName'] as string;

  const setItemFilter = (filterValue: string) => {
    updateQuery({
      codeOrName: filterValue,
    });
  };

  const sortedAndFilteredLines = useMemo(() => {
    if (!data) return [];

    const lines = data.lines.nodes || [];
    const currentSortColumn = columns.find(({ key }) => key === sortBy.key);

    if (!currentSortColumn?.getSortValue) return lines;

    const sorter = SortUtils.getColumnSorter(
      currentSortColumn?.getSortValue,
      !!sortBy.isDesc
    );

    return [...lines].sort(sorter).filter(line => {
      if (!itemFilter) return true;
      const {
        item: { code, name },
      } = line;
      return (
        code?.toLowerCase().includes(itemFilter.toLowerCase()) ||
        name?.toLowerCase().includes(itemFilter.toLowerCase())
      );
    });
  }, [data, columns, sortBy, itemFilter]);

  return { sortedAndFilteredLines, itemFilter, setItemFilter };
};
