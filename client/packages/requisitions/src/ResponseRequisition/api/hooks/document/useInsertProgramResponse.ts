import { useQueryClient, useMutation, useTranslation, InsertProgramResponseRequisitionInput, useNotification } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useInsertProgramResponse = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  const t = useTranslation();
  const { error } = useNotification();


  const { mutateAsync } = useMutation(api.insertProgram, {
    onSettled: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });

  const insert = async (input: InsertProgramResponseRequisitionInput) => {
    const result = await mutateAsync(input);
    if (result.__typename == "InsertProgramResponseRequisitionError") {
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


