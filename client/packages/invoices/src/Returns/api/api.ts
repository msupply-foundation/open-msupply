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
    invoiceByNumber: async (invoiceNumber: number) => {
      const result = await sdk.invoiceByNumber({
        invoiceNumber,
        storeId,
      });

      return result?.invoiceByNumber;
    },
  },
});
