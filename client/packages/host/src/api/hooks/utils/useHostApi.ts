import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';
import { getHostQueries } from '../../api';

export const useHostApi = () => {
  const keys = {
    base: () => ['host'] as const,
    displaySettings: () => [...keys.base(), 'displaySettings'] as const,
    labelPrinterSettings: () =>
      [...keys.base(), 'labelPrinterSettings'] as const,
    databaseSettings: () => [...keys.base(), 'databaseSettings'] as const,
    plugins: () => [...keys.base(), 'plugins'] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getHostQueries(getSdk(client));
  return { ...queries, storeId, keys };
};
