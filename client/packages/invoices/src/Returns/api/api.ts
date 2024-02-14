import { SupplierReturnInput } from '@common/types';
import { Sdk } from './operations.generated';

export const getReturnsQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    newSupplierReturnLines: async (inboundShipmentLineIds: string[]) => {
      const result = await sdk.newSupplierReturnLines({
        inboundShipmentLineIds,
        storeId,
      });

      return result?.newSupplierReturn;
    },
    inboundReturnLines: async (outboundShipmentLineIds: string[]) => {
      const result = await sdk.inboundReturnLines({
        outboundShipmentLineIds,
        storeId,
      });

      return result?.inboundReturnLines;
    },
  },
  insertSupplierReturn: async (input: SupplierReturnInput) => {
    const result = await sdk.insertSupplierReturn({
      input,
    });

    return result.insertSupplierReturn;
  },
});
