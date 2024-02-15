import { Sdk } from './operations.generated';

export const getReturnsQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    newSupplierReturnLines: async (lineIds: string[]) => {
      console.log('lineIds', lineIds);
      const result = await sdk.newSupplierReturnLines({
        inboundShipmentLineIds: lineIds,
        storeId,
      });

      return result?.newSupplierReturn;
    },
    invoiceByNumber: async (invoiceNumber: number) => {
      console.log('Query', invoiceNumber);
      const result = await sdk.invoiceByNumber({
        invoiceNumber,
        storeId,
      });
      console.log('result', result);

      return result?.invoiceByNumber;
    },
  },
});
