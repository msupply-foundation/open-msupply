import { useQuery } from '@openmsupply-client/common';
import { useContactGraphQL } from '../useContactsGraphQL';
import { CONTACTS } from './keys';

export const useContacts = (nameId: string) => {
  const { contactApi, storeId } = useContactGraphQL();

  const queryFn = async () => {
    const result = await contactApi.contacts({ nameId, storeId });

    if (result.contacts.__typename === 'ContactConnector') {
      return result.contacts;
    }
    //  TODO rename contactRows to contacts (need to change operations.graphql as well as backend)
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [CONTACTS],
    queryFn,
  });

  return {
    query: { data: data?.nodes ?? [], isLoading, isError },
  };
};
