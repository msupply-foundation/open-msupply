import {
  isEmpty,
  UpdateRnRFormLineInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { RnRFormFragment, RnRFormLineFragment } from '../operations.generated';
import { useRnRFormContext, useRnRGraphQL } from '..';
import { RNR_FORM } from './keys';

export interface RnRFormQuery extends RnRFormFragment {
  lines: RnRFormLineFragment[];
}

export const useRnRForm = ({ rnrFormId }: { rnrFormId: string }) => {
  const { api, storeId } = useRnRGraphQL();
  const { clearDraftLine } = useRnRFormContext();
  const queryKey = [RNR_FORM, rnrFormId];

  const {
    mutateAsync: finalise,
    isLoading: isFinalising,
    error: finaliseError,
  } = useFinalise(rnrFormId);

  const {
    mutateAsync: updateLines,
    isLoading: isUpdating,
    error: updateLineError,
  } = useUpdateLine(rnrFormId);

  const queryFn = async (): Promise<RnRFormQuery | null> => {
    const query = await api.rAndRFormDetail({
      storeId,
      rnrFormId,
    });

    const result = query?.rAndRForm;
    return result.__typename === 'RnRFormNode' ? result : null;
  };

  const query = useQuery({ queryKey, queryFn });

  const updateLine = async (line: RnRFormLineFragment) => {
    await updateLines([line]);
    clearDraftLine(line.id);
  };

  const confirmRemainingLines = async () => {
    if (!query.data) return;

    let lines = query.data.lines
      .filter(line => !line.confirmed)
      .map(line => ({ ...line, confirmed: true }));
    await updateLines(lines);
  };

  return {
    query,
    finalise: { finalise, isFinalising, finaliseError },
    updateLine: { updateLine, isUpdating, updateLineError },
    confirmRemainingLines,
  };
};

// MUTATIONS

const useUpdateLine = (rnrFormId: string) => {
  const { api, storeId, queryClient } = useRnRGraphQL();

  const mutationFn = async (lines: RnRFormLineFragment[]) => {
    const linesInput: UpdateRnRFormLineInput[] = lines.map(
      ({
        adjustedQuantityConsumed,
        adjustments,
        averageMonthlyConsumption,
        confirmed,
        finalBalance,
        id,
        maximumQuantity,
        calculatedRequestedQuantity,
        enteredRequestedQuantity,
        stockOutDuration,
        comment,
        quantityConsumed,
        quantityReceived,
        expiryDate,
        initialBalance,
        lowStock,
      }) => ({
        id,
        quantityConsumed,
        quantityReceived,
        adjustments,
        adjustedQuantityConsumed,
        averageMonthlyConsumption,
        confirmed,
        finalBalance,
        maximumQuantity,
        calculatedRequestedQuantity,
        enteredRequestedQuantity,
        stockOutDuration,
        expiryDate,
        initialBalance,
        comment,
        lowStock,
      })
    );
    const apiResult = await api.updateRnRFormLines({
      storeId,
      input: {
        id: rnrFormId,
        lines: linesInput,
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
  const { api, storeId, queryClient } = useRnRGraphQL();

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
