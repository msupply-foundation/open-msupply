import { useGql, useAuthContext, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';

export const useGetItemPricing = ({
  nameId,
  itemId,
}: {
  nameId?: string;
  itemId: string;
}) => {
  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();

  const result = useQuery(`pricing${storeId}${nameId}${itemId}`, () =>
    sdk.getItemPricing({ storeId, input: { nameId, itemId } })
  );

  return { ...result, itemPrice: result.data?.itemPrice };
};
