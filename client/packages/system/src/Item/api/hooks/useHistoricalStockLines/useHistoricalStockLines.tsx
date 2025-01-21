import { useGql, useAuthContext, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';
import { HISTORICAL_STOCK_LINES } from '../../keys';

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

  const key: string[] = [
    HISTORICAL_STOCK_LINES,
    storeId,
    itemId,
    datetime ?? 'NO_DATETIME',
  ];

  const result = useQuery(key, () =>
    sdk.getHistoricalStockLines({ storeId, itemId, datetime })
  );

  return {
    ...result,
    data: result.data?.historicalStockLines,
  };
};
