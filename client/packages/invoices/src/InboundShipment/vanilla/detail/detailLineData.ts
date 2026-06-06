import {
  BatchInboundShipmentInput,
  ItemSortFieldInput,
} from '@openmsupply-client/common';
import { FnUtils } from '@common/utils';
import { getSdk as getItemSdk } from '@openmsupply-client/system/src/Item/api/operations.generated';
import { IslandCtx, createSdk } from '../context';

export interface ItemOption {
  id: string;
  name: string;
  code: string;
}

export interface LineDraft {
  id: string;
  itemId: string;
  batch: string;
  expiryDate: string; // yyyy-mm-dd or ''
  packSize: number;
  numberOfPacks: number;
  costPricePerPack: number;
  sellPricePerPack: number;
}

const runBatch = async (ctx: IslandCtx, input: BatchInboundShipmentInput) => {
  const sdk = createSdk(ctx);
  if (ctx.isExternal)
    await sdk.upsertInboundShipmentExternal({ storeId: ctx.storeId, input });
  else await sdk.upsertInboundShipment({ storeId: ctx.storeId, input });
};

export const insertLine = async (
  ctx: IslandCtx,
  invoiceId: string,
  draft: LineDraft
): Promise<void> => {
  await runBatch(ctx, {
    insertInboundShipmentLines: [
      {
        id: FnUtils.generateUUID(),
        invoiceId,
        itemId: draft.itemId,
        batch: draft.batch || undefined,
        expiryDate: draft.expiryDate || undefined,
        packSize: draft.packSize,
        numberOfPacks: draft.numberOfPacks,
        costPricePerPack: draft.costPricePerPack,
        sellPricePerPack: draft.sellPricePerPack,
      },
    ],
  });
};

export const updateLine = async (
  ctx: IslandCtx,
  draft: LineDraft
): Promise<void> => {
  await runBatch(ctx, {
    updateInboundShipmentLines: [
      {
        id: draft.id,
        itemId: draft.itemId,
        batch: draft.batch || undefined,
        expiryDate: { value: draft.expiryDate || null },
        packSize: draft.packSize,
        numberOfPacks: draft.numberOfPacks,
        costPricePerPack: draft.costPricePerPack,
        sellPricePerPack: draft.sellPricePerPack,
      },
    ],
  });
};

export const deleteLine = async (
  ctx: IslandCtx,
  lineId: string
): Promise<void> => {
  const sdk = createSdk(ctx);
  const input: BatchInboundShipmentInput = {
    deleteInboundShipmentLines: [{ id: lineId }],
  };
  if (ctx.isExternal)
    await sdk.deleteInboundShipmentLinesExternal({ storeId: ctx.storeId, input });
  else await sdk.deleteInboundShipmentLines({ storeId: ctx.storeId, input });
};

/** Item search for the add-line picker. */
export const fetchItems = async (
  ctx: IslandCtx,
  search: string
): Promise<ItemOption[]> => {
  const sdk = getItemSdk(ctx.client);
  const result = await sdk.items({
    storeId: ctx.storeId,
    key: ItemSortFieldInput.Name,
    first: 50,
    filter: {
      isVisible: true,
      ...(search.trim() ? { codeOrName: { like: search.trim() } } : {}),
    },
  });
  return (result?.items?.nodes ?? []).map(n => ({
    id: n.id,
    name: n.name,
    code: n.code,
  }));
};
