import {
  PropertyParentTableEnum,
  UpsertPropertyValueGqlInput,
  useMutation,
} from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { invalidateParentRecord } from './invalidateParentRecord';

export const useUpsertPropertyValue = (
  table: PropertyParentTableEnum,
  recordId: string | undefined
) => {
  const { propertyApi, queryClient } = usePropertyGraphQL();

  return useMutation({
    mutationFn: async (input: UpsertPropertyValueGqlInput) => {
      const result = await propertyApi.upsertPropertyValue({ input });
      return result.upsertPropertyValue;
    },
    onSuccess: () => invalidateParentRecord(queryClient, table, recordId),
  });
};
