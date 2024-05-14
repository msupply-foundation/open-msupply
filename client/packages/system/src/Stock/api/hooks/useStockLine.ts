import { useState } from 'react';
import {
  FnUtils,
  setNullableInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import {
  InventoryAdjustmentReasonRowFragment,
  StockLineRowFragment,
} from '../../..';
import { STOCK_LINE } from './keys';
import { useStockGraphQL } from '../useStockGraphQL';

export interface DraftStockLine extends StockLineRowFragment {
  inventoryAdjustmentReason: InventoryAdjustmentReasonRowFragment | null;
}

const defaultDraftStockLine = {
  __typename: 'StockLineNode',
  id: '',
  itemId: '',
  onHold: false,
  packSize: 0,
  sellPricePerPack: 0,
  costPricePerPack: 0,
  totalNumberOfPacks: 0,
  availableNumberOfPacks: 0,
  storeId: '',
  item: {
    __typename: 'ItemNode',
    code: '',
    name: '',
  },
  inventoryAdjustmentReason: null,
};

export function useStockLine(id?: string) {
  const [patch, setPatch] = useState<Partial<DraftStockLine>>({});
  const { data, isLoading, error } = useGet(id ?? '');
  const { mutateAsync: createMutation } = useCreate();
  const { mutateAsync: updateMutation } = useUpdate(id ?? '');

  const draft = (
    data
      ? { ...data?.nodes[0], ...patch }
      : { ...defaultDraftStockLine, ...patch }
  ) as DraftStockLine;

  console.log('Draft', draft);

  const updatePatch = (newData: Partial<DraftStockLine>) => {
    // Only add changed values to patch
    const changedData = data
      ? Object.fromEntries(
          Object.entries(newData).filter(
            ([key, value]) => value !== draft[key as keyof DraftStockLine]
          )
        )
      : newData;
    setPatch({ ...patch, ...changedData });
  };

  const create = () => createMutation(draft);
  const update = () => updateMutation(patch);

  return {
    query: { data: data?.nodes[0], isLoading, error },
    draft,
    updatePatch,
    create,
    update,
  };
}

const useGet = (id: string) => {
  const { stockApi, storeId } = useStockGraphQL();

  const queryFn = async () => {
    const result = await stockApi.stockLine({
      id,
      storeId,
    });

    if (result.stockLines.__typename === 'StockLineConnector') {
      return result.stockLines;
    }
  };

  const query = useQuery({
    queryKey: ['stock', id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};

const useCreate = () => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  const mutationFn = async ({
    itemId,
    inventoryAdjustmentReason,
    packSize,
    totalNumberOfPacks,
    barcode,
    batch,
    expiryDate,
    sellPricePerPack,
    costPricePerPack,
    location,
    onHold,
  }: DraftStockLine) => {
    return await stockApi.insertStockLine({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        itemId,
        packSize,
        barcode,
        batch,
        expiryDate,
        sellPricePerPack,
        costPricePerPack,
        onHold,
        numberOfPacks: totalNumberOfPacks,
        location: setNullableInput('id', location),
        inventoryAdjustmentReasonId: inventoryAdjustmentReason?.id,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      // Stock line list needs to be re-fetched to include the new stock line
      queryClient.invalidateQueries([STOCK_LINE]),
  });
};

const useUpdate = (id: string) => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  const mutationFn = async ({
    barcode,
    batch,
    expiryDate,
    sellPricePerPack,
    costPricePerPack,
    onHold,
    location,
  }: Partial<DraftStockLine>) => {
    const result = await stockApi.updateStockLine({
      input: {
        id,
        barcode,
        batch,
        costPricePerPack,
        expiryDate,
        onHold,
        sellPricePerPack,
        location: setNullableInput('id', location),
      },
      storeId,
    });

    const { updateStockLine } = result;

    if (updateStockLine?.__typename === 'StockLineNode') {
      return updateStockLine;
    }

    throw new Error('Unable to update stock line');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([STOCK_LINE]),
  });
};
