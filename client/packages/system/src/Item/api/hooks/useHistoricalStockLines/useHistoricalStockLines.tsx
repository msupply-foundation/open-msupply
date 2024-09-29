import { useGql, useAuthContext, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';

export const useHistoricalStockLines = ({
  itemId,
  datetime,
}: {
  itemId: string;
  datetime?: string;
}) => {
  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();

  const result = useQuery(`stocklinesAt${storeId}${itemId}${datetime}`, () =>
    sdk.getHistoricalStockLines({ storeId, itemId, datetime })
  );

  return {
    ...result,
    data: result.data?.historicalStockLines,
  };
};
