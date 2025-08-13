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
    requestedNumberOfUnits: 0,
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
    pricePerUnitBeforeDiscount,
    discountPercentage,
    pricePerUnitAfterDiscount,
  } = data;

  console.log('newField', newField);
  console.log('previouslyChangedField', previouslyChangedField);
  console.log('data', {
    pricePerUnitAfterDiscount,
    pricePerUnitBeforeDiscount,
    discountPercentage,
  });

  const updateField = [
    'pricePerUnitAfterDiscount',
    'pricePerUnitBeforeDiscount',
    'discountPercentage',
  ].filter(
    field => field !== newField && field !== previouslyChangedField
  )[0] as PriceField;

  console.log('updateField', updateField);

  switch (updateField) {
    case 'discountPercentage': {
      console.log(
        'New discountPercentage',
        (pricePerUnitBeforeDiscount - pricePerUnitAfterDiscount) /
          (pricePerUnitBeforeDiscount || 1)
      );
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
