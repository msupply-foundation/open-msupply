import { useMutation, useQuery } from '@openmsupply-client/common';
import { useStockGraphQL } from '../useStockGraphQL';
import { useState } from 'react';
import { RepackDraft } from '../../types';
import { STOCK_LINE, LIST, STOCK } from './keys';

type UseRepackProps = { stockLineId?: string; invoiceId?: string };

export const useRepack = ({ invoiceId, stockLineId }: UseRepackProps) => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();
  const [draft, setDraft] = useState<RepackDraft>({
    stockLineId,
    newPackSize: 0,
    numberOfPacks: 0,
  });

  // FETCH LIST
  const queryListFn = async () => {
    const result = await stockApi.repacksByStockLine({
      storeId,
      stockLineId: stockLineId ?? '',
    });

    return result.repacksByStockLine;
  };

  const {
    data: listData,
    isError: isListError,
    isLoading: isListLoading,
  } = useQuery({
    queryKey: [STOCK_LINE, storeId, stockLineId],
    queryFn: queryListFn,
    enabled: !!stockLineId,
  });

  // FETCH SINGLE
  const queryFn = async () => {
    const result = await stockApi.repack({
      storeId,
      invoiceId: invoiceId ?? '',
    });

    if (result.repack.__typename === 'RepackNode') {
      return result.repack;
    }
  };

  const { data, isError, isLoading } = useQuery({
    queryKey: [STOCK, invoiceId],
    queryFn,
    enabled: !!invoiceId,
  });

  // UPDATE DRAFT
  const onChange = (patch: Partial<RepackDraft>) => {
    setDraft({ ...draft, ...patch });
  };

  // INSERT NEW
  const mutationFn = async () => {
    const result = await stockApi.insertRepack({
      storeId,
      input: {
        stockLineId: draft.stockLineId ?? '',
        newPackSize: draft.newPackSize ?? 0,
        numberOfPacks: draft.numberOfPacks ?? 0,
        newLocationId: draft.newLocationId ?? undefined,
      },
    });

    return result.insertRepack;
  };

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      // Stock list needs to be re-fetched to load new repacked stock line
      queryClient.invalidateQueries([STOCK_LINE, storeId, LIST]);
      // Repack list also needs to be re-fetched on insert to show new repack
      // line
      queryClient.invalidateQueries([STOCK_LINE, storeId, draft.stockLineId]);
    },
  });

  return {
    // Fetch
    list: {
      repacks: listData?.nodes,
      isError: isListError,
      isLoading: isListLoading,
    },
    repack: { repackData: data, isLoading, isError },
    // Update draft
    draft,
    onChange,
    // Create
    onInsert: mutation.mutateAsync,
  };
};
