import { ItemStockOnHandFragment } from '@openmsupply-client/system/src';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { FnUtils } from '@common/utils';
import {
  PurchaseOrderLineStatusNode,
  PurchaseOrderNodeStatus,
} from '@common/types';

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
    lineNumber: 0,
    adjustedNumberOfUnits: null,
    pricePerUnitBeforeDiscount: 0,
    pricePerUnitAfterDiscount: 0,
    unit: item.unitName,
    item: {
      __typename: 'ItemNode',
      id: item.id,
      code: item.code,
      name: item.name,
      unitName: item.unitName,
      stats: {
        __typename: 'ItemStatsNode',
        stockOnHand: item.stats?.stockOnHand || 0,
      },
    },
    // This value not actually saved to DB
    discountPercentage: 0,
    numberOfPacks: 0,
    status: PurchaseOrderLineStatusNode.New,
    receivedNumberOfUnits: 0,
    unitsOrderedInOthers: 0,
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
 * `changingField` is the fields being updated by the user, and `data` contains
 * the current state of all 3.
 */
export const calculatePricesAndDiscount = (
  changingField: PriceField,
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

export const calculateUnitQuantities = (
  status: PurchaseOrderNodeStatus,
  data: Partial<DraftPurchaseOrderLine>
) => {
  const numberOfPacks = data?.numberOfPacks ?? 0;
  const requestedPackSize = data?.requestedPackSize ?? 0;
  const totalUnits = numberOfPacks * requestedPackSize;

  // Only adjust the requested number of units if the status is not confirmed yet
  if (
    status === PurchaseOrderNodeStatus.Confirmed ||
    status === PurchaseOrderNodeStatus.Sent
  ) {
    return {
      adjustedNumberOfUnits: totalUnits,
    };
  }
  return {
    requestedNumberOfUnits: totalUnits,
    adjustedNumberOfUnits: totalUnits,
  };
};

type LineStatusOption = {
  value: PurchaseOrderLineStatusNode;
  disabled: boolean;
};

export const lineStatusOptions = (
  status: PurchaseOrderNodeStatus
): LineStatusOption[] => {
  const disableNewOption =
    status === PurchaseOrderNodeStatus.Confirmed ||
    status === PurchaseOrderNodeStatus.Sent
      ? true
      : false;
  const disableOtherOptions =
    status === PurchaseOrderNodeStatus.New ||
    status === PurchaseOrderNodeStatus.RequestApproval
      ? true
      : false;

  return [
    {
      value: PurchaseOrderLineStatusNode.New,
      disabled: disableNewOption,
    },
    { value: PurchaseOrderLineStatusNode.Sent, disabled: disableOtherOptions },
    {
      value: PurchaseOrderLineStatusNode.Closed,
      disabled: disableOtherOptions,
    },
  ];
};
