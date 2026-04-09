import { useGql, useAuthContext, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';
import { HISTORICAL_STOCK_LINES } from '../../keys';

export const useHistoricalStockLines = ({
  itemId,
  datetime,
  enabled = true,
}: {
  itemId: string;
  datetime?: string;
  enabled?: boolean;
}) => {
  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();

  const key: string[] = [
    HISTORICAL_STOCK_LINES,
    storeId,
    itemId,
    datetime ?? 'NO_DATETIME',
  ];

  const result = useQuery(
    key,
    () => sdk.getHistoricalStockLines({ storeId, itemId, datetime }),
    { enabled, keepPreviousData: true }
  );

  return {
    ...result,
    data: result.data?.historicalStockLines,
  };
};
