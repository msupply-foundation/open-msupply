import { useQuery } from '@openmsupply-client/common';
import { useContactGraphQL } from '../useContactsGraphQL';
import { CONTACTS } from './keys';

export const useContacts = (nameId: string) => {
  const { contactApi, storeId } = useContactGraphQL();

  const queryFn = async () => {
    const result = await contactApi.contacts({ nameId, storeId });
    if (result.contacts.__typename === 'ContactConnector')
      return result.contacts;
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [CONTACTS, storeId, nameId],
    queryFn,
  });

  return { data: data?.nodes ?? [], isLoading, isError };
};
