import { useQueryClient, useMutation, useTranslation, useNotification, InsertProgramRequestRequisitionInput } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertProgramRequest = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  const t = useTranslation();
  const { error } = useNotification();

  const { mutateAsync } = useMutation(api.insertProgram, {
    onSettled: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });

  const insert = async (input: InsertProgramRequestRequisitionInput) => {
    const result = await mutateAsync(input);
    if (result.__typename == "InsertProgramRequestRequisitionError") {
      switch (result.error.__typename) {
        case "MaxOrdersReachedForPeriod": {
          error(t('error.max-orders-reached-for-period'))()
          break;
        }
        default:
          error(t('error.unable-to-create-requisition'))()
      }
    }
    return result
  }

  return {
    insert
  }
};
