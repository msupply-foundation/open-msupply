import {
  SortBy,
  InventoryAdjustmentReasonSortInput,
  InventoryAdjustmentReasonSortFieldInput,
} from '@openmsupply-client/common';
import { Sdk, InventoryAdjustmentReasonRowFragment } from './operations.generated';

export type ListParams = { sortBy?: SortBy<InventoryAdjustmentReasonRowFragment> };

const inventoryAdjustmentReasonParsers = {
  toSortInput: (sortBy: SortBy<InventoryAdjustmentReasonRowFragment>): InventoryAdjustmentReasonSortInput => {
    return { desc: sortBy.isDesc, key: sortBy.key as InventoryAdjustmentReasonSortFieldInput };
  },
};

export const getInventoryAdjustmentReasonsQuery = (sdk: Sdk) => ({
  get: {
    listAllActive: async ({ sortBy }: ListParams) => {
      const response = await sdk.inventoryAdjustmentReasons({
        sort: sortBy ? inventoryAdjustmentReasonParsers.toSortInput(sortBy) : undefined,
        filter: { isActive: true },
      });
      return response?.inventoryAdjustmentReasons;
    },
  },
});
