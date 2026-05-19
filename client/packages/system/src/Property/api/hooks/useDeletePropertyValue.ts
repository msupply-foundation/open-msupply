import { PropertyParentTableEnum, useMutation } from '@openmsupply-client/common';
import { usePropertyGraphQL } from '../usePropertyGraphQL';
import { invalidateParentRecord } from './invalidateParentRecord';

interface DeletePropertyValueInput {
  table: PropertyParentTableEnum;
  recordId: string;
  propertyId: string;
}

export const useDeletePropertyValue = (
  table: PropertyParentTableEnum,
  recordId: string | undefined
) => {
  const { propertyApi, queryClient } = usePropertyGraphQL();

  return useMutation({
    mutationFn: async (input: DeletePropertyValueInput) => {
      const result = await propertyApi.deletePropertyValue(input);
      return result.deletePropertyValue;
    },
    onSuccess: () => invalidateParentRecord(queryClient, table, recordId),
  });
};
