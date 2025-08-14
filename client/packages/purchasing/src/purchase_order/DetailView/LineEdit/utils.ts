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

/**
 * Calculates any of the these values from the other two, based on which have
 * most recently changed.
 *
 * `newField` is the field that is currently active, and the
 * `previouslyChangedField` is the previous one changed, as tracked by the
 * useLastChangedField hook (below).
 */
export const calculatePricesAndDiscount = (
  changingField: PriceField,
  // previouslyChangedField: PriceField | null,
  data: Partial<DraftPurchaseOrderLine>
) => {
  const {
    pricePerUnitBeforeDiscount = 0,
    discountPercentage,
    pricePerUnitAfterDiscount = 0,
  } = data;

  switch (changingField) {
    case 'pricePerUnitBeforeDiscount': {
      // Update the price after discount based on discount percentage
      return {
        pricePerUnitBeforeDiscount,
        discountPercentage,
        pricePerUnitAfterDiscount:
          pricePerUnitBeforeDiscount * (1 - (discountPercentage || 0) / 100),
      };
    }
    case 'discountPercentage': {
      // Update the price after discount based on original price
      return {
        pricePerUnitBeforeDiscount,
        discountPercentage,
        pricePerUnitAfterDiscount:
          pricePerUnitBeforeDiscount * (1 - (discountPercentage || 0) / 100),
      };
    }
    case 'pricePerUnitAfterDiscount': {
      // Update the discount percentage based on original price
      return {
        pricePerUnitBeforeDiscount,
        discountPercentage:
          ((pricePerUnitBeforeDiscount - pricePerUnitAfterDiscount) /
            (pricePerUnitBeforeDiscount || 1)) *
          100,
        pricePerUnitAfterDiscount,
      };
    }
  }
};
