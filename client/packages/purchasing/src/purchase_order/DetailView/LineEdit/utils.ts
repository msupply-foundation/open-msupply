import { ItemStockOnHandFragment } from '@openmsupply-client/system/src';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { FnUtils } from '@common/utils';
import { PurchaseOrderNodeStatus } from '@common/types';

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
    numberOfPacks: 0,
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

  // const updateField = [
  //   'pricePerUnitAfterDiscount',
  //   'pricePerUnitBeforeDiscount',
  //   'discountPercentage',
  // ].filter(
  //   field => field !== changingField && field !== previouslyChangedField
  // )[0];

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

type UnitCalcFields = 'numberOfPacks' | 'packSize';

export const calculateUnitQuantities = (
  changingField: UnitCalcFields,
  status: PurchaseOrderNodeStatus,
  data: Partial<DraftPurchaseOrderLine>,
  draft: DraftPurchaseOrderLine | null | undefined
) => {
  let numberOfPacks = draft?.numberOfPacks ?? 0;
  let requestedPackSize = draft?.requestedPackSize ?? 0;

  switch (changingField) {
    case 'numberOfPacks': {
      numberOfPacks = data.numberOfPacks || 0;
      break;
    }
    case 'packSize': {
      requestedPackSize = data.requestedPackSize || 0;
      break;
    }
  }

  const totalUnits = numberOfPacks * requestedPackSize;

  // Only adjust the requested number of units if the status is not confirmed yet
  if (status === PurchaseOrderNodeStatus.Confirmed) {
    return {
      adjustedNumberOfUnits: totalUnits,
    };
  }
  return {
    requestedNumberOfUnits: totalUnits,
    adjustedNumberOfUnits: totalUnits,
  };
};
