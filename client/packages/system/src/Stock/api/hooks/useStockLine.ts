import { useCallback, useState } from 'react';
import {
  FnUtils,
  setNullableInput,
  useMutation,
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

export function useStockLine() {
  const [draft, setDraft] = useState<DraftStockLine>({
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
  });

  const { mutateAsync: createMutation } = useCreate();

  const create = useCallback(async () => {
    await createMutation(draft);
  }, [draft, createMutation]);

  return {
    draft,
    setDraft,
    create,
  };
}

const useCreate = () => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  return useMutation(
    async ({
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
    },
    {
      onSuccess: () =>
        // Stock line list needs to be refetched to include the new stock line
        queryClient.invalidateQueries([STOCK_LINE]),
    }
  );
};
