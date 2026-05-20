import {
  PropertyV2ParentTableEnum,
  UpsertPropertyV2ValueGqlInput,
  useMutation,
} from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { invalidateParentRecord } from './invalidateParentRecord';

export const useUpsertPropertyValue = (
  table: PropertyV2ParentTableEnum,
  recordId: string | undefined
) => {
  const { propertyApi, queryClient } = usePropertyGraphQL();

  return useMutation({
    mutationFn: async (input: UpsertPropertyV2ValueGqlInput) => {
      const result = await propertyApi.upsertPropertyV2Value({ input });
      return result.upsertPropertyV2Value;
    },
    onSuccess: () => invalidateParentRecord(queryClient, table, recordId),
  });
};
