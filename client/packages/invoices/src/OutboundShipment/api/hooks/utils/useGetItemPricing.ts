import { useGql, useAuthContext, useQuery } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';

// Should only fire when nameId is not null (userQuery has parameter for that)
// Consumer to also handle error ?
export const useGetItemPricing = ({
  nameId,
  itemId,
}: {
  nameId: string;
  itemId: string;
}) => {
  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();

  const result = useQuery(`discount${storeId}${nameId}${itemId}`, () =>
    sdk.getItemPricing({ storeId, input: { nameId, itemId } })
  );

  return { ...result, itemPrice: result.data?.itemPrice };
};
