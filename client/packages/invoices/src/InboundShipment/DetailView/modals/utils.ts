import { InvoiceLineNodeType, FnUtils } from '@openmsupply-client/common';
import { ItemFragment } from '@openmsupply-client/system';
import { DraftInboundLine } from './../../../types';
import { InboundLineFragment } from './../../api/operations.generated';

type InboundLineItem = InboundLineFragment['item'];

export interface CreateDraftInboundLineParams {
  item: ItemFragment | InboundLineItem;
  invoiceId: string;
  seed?: InboundLineFragment;
  type?: InvoiceLineNodeType;
  batch?: string;
  expiryDate?: string;
}

const createDraftInboundLine = ({
  item,
  invoiceId,
  seed,
  type = InvoiceLineNodeType.StockIn,
  batch,
  expiryDate,
}: CreateDraftInboundLineParams): DraftInboundLine => {
  const { defaultPackSize = 1, itemStoreProperties } = item || {};
  const draftLine: DraftInboundLine = {
    __typename: 'InvoiceLineNode',
    totalAfterTax: 0,
    totalBeforeTax: 0,
    id: FnUtils.generateUUID(),
    invoiceId,
    packSize: defaultPackSize,
    sellPricePerPack: seed
      ? seed.sellPricePerPack
      : (itemStoreProperties?.defaultSellPricePerPack ?? 0),
    costPricePerPack: 0,
    numberOfPacks: 0,
    isCreated: !seed,
    expiryDate,
    batch,
    location: undefined,
    type,
    item,
    itemName: item.name,
    volumePerPack: 0.0,
    shippedPackSize: defaultPackSize,
    ...seed,
  };

  return draftLine;
};

export const CreateDraft = {
  stockInLine: createDraftInboundLine,
  serviceLine: (params: Omit<CreateDraftInboundLineParams, 'type'>) =>
    createDraftInboundLine({
      ...params,
      type: InvoiceLineNodeType.Service,
    }),
};
