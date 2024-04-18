import { Sdk } from './operations.generated';

export const getReturnReasonsQuery = (sdk: Sdk) => ({
  get: {
    listAllActive: async () => {
      const response = await sdk.returnReasons({
        filter: { isActive: true },
      });
      return response?.returnReasons;
    },
  },
});
