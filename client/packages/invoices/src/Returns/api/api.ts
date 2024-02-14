import { SupplierReturnInput } from '@common/types';
import { Sdk } from './operations.generated';

export const getReturnsQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    newSupplierReturnLines: async (lineIds: string[]) => {
      const result = await sdk.newSupplierReturnLines({
        inboundShipmentLineIds: lineIds,
        storeId,
      });

      return result?.newSupplierReturn;
    },
  },
  insertSupplierReturn: async (input: SupplierReturnInput) => {
    const result = await sdk.insertSupplierReturn({
      input,
    });

    return result.insertSupplierReturn;
  },
});
