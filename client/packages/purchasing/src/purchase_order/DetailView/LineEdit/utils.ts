import { ItemStockOnHandFragment } from '@openmsupply-client/system/src';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { FnUtils } from '@common/utils';

export const createDraftPurchaseOrderLine = (
  item: ItemStockOnHandFragment,
  purchaseOrderId: string
): DraftPurchaseOrderLine => {
  return {
    id: FnUtils.generateUUID(),
    purchaseOrderId,
    itemId: item.id,
    requestedPackSize: 0,
    requestedDeliveryDate: null,
    expectedDeliveryDate: null,
    requestedNumberOfUnits: 0,
    adjustedNumberOfUnits: null,
    pricePerUnitBeforeDiscount: 0,
    pricePerUnitAfterDiscount: 0,
    // This value not actually saved to DB
    discountPercentage: 0,
  };
};

type PriceField =
  | 'pricePerUnitBeforeDiscount'
  | 'discountPercentage'
  | 'pricePerUnitAfterDiscount';

// Calculates any of the these values from the other two, based on which have
// most recently changed
export const calculatePricesAndDiscount = (
  newField: PriceField,
  previouslyChangedField: PriceField | null,
  data: Partial<DraftPurchaseOrderLine>
) => {
  const {
    pricePerUnitBeforeDiscount = 0,
    discountPercentage,
    pricePerUnitAfterDiscount = 0,
  } = data;

  const updateField = [
    'pricePerUnitAfterDiscount',
    'pricePerUnitBeforeDiscount',
    'discountPercentage',
  ].filter(
    field => field !== newField && field !== previouslyChangedField
  )[0] as PriceField;

  switch (updateField) {
    case 'discountPercentage': {
      return {
        pricePerUnitBeforeDiscount,
        pricePerUnitAfterDiscount,
        discountPercentage:
          ((pricePerUnitBeforeDiscount - pricePerUnitAfterDiscount) /
            (pricePerUnitBeforeDiscount || 1)) *
          100,
      };
    }
    case 'pricePerUnitAfterDiscount': {
      return {
        pricePerUnitBeforeDiscount,
        discountPercentage,
        pricePerUnitAfterDiscount:
          pricePerUnitBeforeDiscount * (1 - (discountPercentage || 0) / 100),
      };
    }
    case 'pricePerUnitBeforeDiscount': {
      return {
        pricePerUnitAfterDiscount,
        discountPercentage,
        pricePerUnitBeforeDiscount:
          pricePerUnitAfterDiscount / (1 - (discountPercentage || 0) / 100),
      };
    }
  }
};
