import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useHelpDocumentGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const helpDocumentApi = getSdk(client);

  return { helpDocumentApi, queryClient };
};
