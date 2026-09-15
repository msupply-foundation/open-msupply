import { useGql } from '@openmsupply-client/common';
import { getFormSchemaQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useFormSchemaApi = () => {
  const keys = {
    base: () => ['formSchema'] as const,
    byType: (type: string) => [...keys.base(), 'type', type] as const,
  };
  const { client } = useGql();
  const queries = getFormSchemaQueries(getSdk(client));

  return { ...queries, keys };
};
