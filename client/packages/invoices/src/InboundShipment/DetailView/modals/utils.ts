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
  /** Price per unit from the default price master list, if any */
  defaultPricePerUnit?: number;
}

const createDraftInboundLine = ({
  item,
  invoiceId,
  seed,
  type = InvoiceLineNodeType.StockIn,
  batch,
  expiryDate,
  defaultPricePerUnit,
}: CreateDraftInboundLineParams): DraftInboundLine => {
  const { defaultPackSize = 1, itemStoreProperties } = item || {};
  const volumePerPack =
    'volumePerPack' in item ? (item.volumePerPack ?? 0.0) : 0.0;
  const draftLine: DraftInboundLine = {
    __typename: 'InvoiceLineNode',
    totalAfterTax: 0,
    totalBeforeTax: 0,
    id: FnUtils.generateUUID(),
    invoiceId,
    packSize: defaultPackSize,
    sellPricePerPack: seed
      ? seed.sellPricePerPack
      : itemStoreProperties?.defaultSellPricePerPack ||
        (defaultPricePerUnit ?? 0) * defaultPackSize,
    costPricePerPack: 0,
    numberOfPacks: 0,
    isCreated: !seed,
    expiryDate,
    batch,
    location: undefined,
    type,
    item,
    itemName: item.name,
    volumePerPack,
    shippedPackSize: defaultPackSize,
    ...seed,
  };

  return draftLine;
};

export const getDefaultSellPricePerPack = ({
  costPricePerPack,
  packSize,
  defaultPackSize,
  defaultSellPricePerPack,
  itemMargin,
  supplierMargin,
  itemMarginOverridesSupplierMargin,
  defaultPricePerUnit,
}: {
  costPricePerPack: number;
  packSize: number;
  defaultPackSize: number;
  defaultSellPricePerPack: number;
  itemMargin: number;
  supplierMargin: number;
  itemMarginOverridesSupplierMargin: boolean;
  /** Price per unit from the default price master list, if any */
  defaultPricePerUnit: number;
}): number => {
  const defaultPrice =
    defaultPackSize === 0
      ? 0
      : (defaultSellPricePerPack / defaultPackSize) * packSize;
  if (defaultPrice > 0) return defaultPrice;

  const margin = itemMarginOverridesSupplierMargin
    ? itemMargin || supplierMargin
    : supplierMargin || itemMargin;
  const marginPrice =
    costPricePerPack + (costPricePerPack * (margin || 0)) / 100;
  if (margin > 0 && marginPrice > 0) return marginPrice;

  const masterListPrice = defaultPricePerUnit * packSize;
  if (masterListPrice > 0) return masterListPrice;

  return costPricePerPack;
};

export const CreateDraft = {
  stockInLine: createDraftInboundLine,
  serviceLine: (params: Omit<CreateDraftInboundLineParams, 'type'>) =>
    createDraftInboundLine({
      ...params,
      type: InvoiceLineNodeType.Service,
    }),
};
