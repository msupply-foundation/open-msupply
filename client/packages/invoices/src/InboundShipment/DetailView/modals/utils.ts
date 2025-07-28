import { InvoiceLineNodeType, FnUtils } from '@openmsupply-client/common';
import { DraftInboundLine } from './../../../types';
import { InboundLineFragment } from './../../api/operations.generated';

type InboundLineItem = InboundLineFragment['item'];

export interface CreateDraftInboundLineParams {
  item: InboundLineItem;
  invoiceId: string;
  seed?: InboundLineFragment;
  type?: InvoiceLineNodeType;
}

const createDraftInboundLine = ({
  item,
  invoiceId,
  seed,
  type = InvoiceLineNodeType.StockIn,
}: CreateDraftInboundLineParams): DraftInboundLine => {
  const { defaultPackSize = 1, itemStoreProperties, name } = item || {};
  const getSellPricePerPack = () => {
    if (!seed) {
      return itemStoreProperties?.defaultSellPricePerPack ?? 0;
    }
    if (defaultPackSize === seed.packSize) {
      return seed.sellPricePerPack;
    }
    return 0;
  };

  const draftLine: DraftInboundLine = {
    __typename: 'InvoiceLineNode',
    totalAfterTax: 0,
    totalBeforeTax: 0,
    id: FnUtils.generateUUID(),
    invoiceId,
    packSize: defaultPackSize,
    sellPricePerPack: getSellPricePerPack(),
    costPricePerPack: 0,
    numberOfPacks: 0,
    isCreated: !seed,
    expiryDate: undefined,
    location: undefined,
    type,
    item,
    itemName: name,
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
