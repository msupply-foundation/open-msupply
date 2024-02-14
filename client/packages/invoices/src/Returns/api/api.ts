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
      const result = await sdk.generateInboundReturnLines({
        outboundShipmentLineIds,
        storeId,
      });

      return result?.generateInboundReturnLines;
    },
  },
  insertSupplierReturn: async (input: SupplierReturnInput) => {
    const result = await sdk.insertSupplierReturn({
      input,
    });

    return result.insertSupplierReturn;
  },
});
