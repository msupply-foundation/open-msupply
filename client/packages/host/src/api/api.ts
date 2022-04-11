import { Sdk } from './operations.generated';

export const getHostQueries = (sdk: Sdk) => ({
  get: {
    version: () => async () => {
      const result = await sdk.apiVersion();
      return result.apiVersion;
    },
  },
});
