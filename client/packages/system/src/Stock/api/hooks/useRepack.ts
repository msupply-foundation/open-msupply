import { useMutation, useQuery } from '@openmsupply-client/common';
import { useStockGraphQL } from '../useStockGraphQL';
import { useState } from 'react';
import { RepackDraft } from '../../types';
import { STOCK_LINE, STOCK } from './keys';

type UseRepackProps = { stockLineId?: string; invoiceId?: string };

export const useRepack = ({ invoiceId, stockLineId }: UseRepackProps) => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();
  const [draft, setDraft] = useState<RepackDraft>({
    stockLineId: stockLineId ?? '',
    packSize: 0,
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
        stockLineId: draft.stockLineId,
        newPackSize: draft.newPackSize,
        numberOfPacks: draft.numberOfPacks,
        newLocationId: draft.newLocationId ?? undefined,
      },
    });

    console.log('result.insertRepack', result.insertRepack);
    return result.insertRepack;
  };

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      // Need to force the following to be re-fetched:
      // - Repack list
      // - Stockline quantity
      // - Ledger
      queryClient.invalidateQueries([STOCK_LINE]);
      queryClient.invalidateQueries([STOCK, invoiceId]);
      onChange({
        packSize: 0,
        newPackSize: 0,
        numberOfPacks: 0,
      });
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
