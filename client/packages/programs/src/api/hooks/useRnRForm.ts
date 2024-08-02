import {
  isEmpty,
  UpdateRnRFormLineInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { RnRFormFragment, RnRFormLineFragment } from '../operations.generated';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { RNR_FORM } from './keys';

export interface RnRForm extends RnRFormFragment {
  lines: RnRFormLineFragment[];
}

export const useRnRForm = ({ rnrFormId }: { rnrFormId: string }) => {
  const { api, storeId } = useProgramsGraphQL();
  const queryKey = [RNR_FORM, rnrFormId];

  const {
    mutateAsync: finalise,
    isLoading: isFinalising,
    error: finaliseError,
  } = useFinalise(rnrFormId);

  const {
    mutateAsync: updateLine,
    isLoading: isUpdating,
    error: updateLineError,
  } = useUpdateLine(rnrFormId);

  const queryFn = async (): Promise<RnRForm | null> => {
    const query = await api.rAndRFormDetail({
      storeId,
      rnrFormId,
    });

    const result = query?.rAndRForm;
    return result.__typename === 'RnRFormNode' ? result : null;
  };

  const query = useQuery({ queryKey, queryFn });

  return {
    query,
    finalise: { finalise, isFinalising, finaliseError },
    updateLine: { updateLine, isUpdating, updateLineError },
  };
};

// MUTATIONS

const useUpdateLine = (rnrFormId: string) => {
  const { api, storeId, queryClient } = useProgramsGraphQL();

  const mutationFn = async ({
    adjustedQuantityConsumed,
    adjustments,
    averageMonthlyConsumption,
    confirmed,
    finalBalance,
    id,
    maximumQuantity,
    requestedQuantity,
    stockOutDuration,
    comment,
    quantityConsumed,
    quantityReceived,
    expiryDate,
    initialBalance,
  }: RnRFormLineFragment) => {
    const lineInput: UpdateRnRFormLineInput = {
      id,
      quantityConsumed,
      quantityReceived,
      adjustments,
      adjustedQuantityConsumed,
      averageMonthlyConsumption,
      confirmed,
      finalBalance,
      maximumQuantity,
      requestedQuantity,
      stockOutDuration,
      expiryDate,
      initialBalance,
      comment,
    };
    const apiResult = await api.updateRnRFormLines({
      storeId,
      input: {
        id: rnrFormId,
        lines: [lineInput],
      },
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.updateRnrForm;

      if (result.__typename === 'RnRFormNode') {
        return;
      }
    }

    throw new Error('Unable to save updates');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([RNR_FORM]),
    // Prevents duplication of error messages
    onError: () => {},
  });
};
const useFinalise = (id: string) => {
  const { api, storeId, queryClient } = useProgramsGraphQL();

  const mutationFn = async () => {
    const apiResult = await api.finaliseRnRForm({
      input: {
        id,
      },
      storeId,
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.finaliseRnrForm;

      if (result.__typename === 'RnRFormNode') {
        return result;
      }
    }

    throw new Error('Unable to finalise');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([RNR_FORM]),
  });
};
