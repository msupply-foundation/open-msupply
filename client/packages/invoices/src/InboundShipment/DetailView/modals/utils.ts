import { InvoiceLineNodeType, FnUtils } from '@openmsupply-client/common';
import { DraftInboundLine } from './../../../types';
import { InboundLineFragment } from './../../api/operations.generated';

type InboundLineItem = InboundLineFragment['item'];

export interface CreateDraftInboundLineParams {
  item: InboundLineItem;
  invoiceId: string;
  seed?: InboundLineFragment;
  type?: InvoiceLineNodeType;
  defaultPackSize: number;
}

const createDraftInboundLine = ({
  item,
  invoiceId,
  seed,
  defaultPackSize,
  type = InvoiceLineNodeType.StockIn,
}: CreateDraftInboundLineParams): DraftInboundLine => {
  const draftLine: DraftInboundLine = {
    __typename: 'InvoiceLineNode',
    totalAfterTax: 0,
    totalBeforeTax: 0,
    id: FnUtils.generateUUID(),
    invoiceId,
    sellPricePerPack: 0,
    costPricePerPack: 0,
    numberOfPacks: 0,
    packSize: defaultPackSize,
    isCreated: seed ? false : true,
    expiryDate: undefined,
    location: undefined,
    type,
    item,
    itemName: item.name,
    ...seed,
  };

  return draftLine;
};

export const CreateDraft = {
  stockInLine: createDraftInboundLine,
  serviceLine: (
    params: Omit<CreateDraftInboundLineParams, 'type' | 'defaultPackSize'>
  ) =>
    createDraftInboundLine({
      ...params,
      type: InvoiceLineNodeType.Service,
      defaultPackSize: 1,
    }),
};
