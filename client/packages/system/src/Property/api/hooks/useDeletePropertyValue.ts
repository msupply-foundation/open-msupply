import { PropertyV2ParentTableEnum, useMutation } from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { invalidateParentRecord } from './invalidateParentRecord';

interface DeletePropertyValueInput {
  table: PropertyV2ParentTableEnum;
  recordId: string;
  propertyId: string;
}

export const useDeletePropertyValue = (
  table: PropertyV2ParentTableEnum,
  recordId: string | undefined
) => {
  const { propertyApi, queryClient } = usePropertyGraphQL();

  return useMutation({
    mutationFn: async (input: DeletePropertyValueInput) => {
      const result = await propertyApi.deletePropertyV2Value(input);
      return result.deletePropertyV2Value;
    },
    onSuccess: () => invalidateParentRecord(queryClient, table, recordId),
  });
};
