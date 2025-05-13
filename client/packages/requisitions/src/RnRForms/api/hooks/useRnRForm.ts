import {
  isEmpty,
  UpdateRnRFormInput,
  UpdateRnRFormLineInput,
  useDebounceCallback,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { RnRFormFragment, RnRFormLineFragment } from '../operations.generated';
import { useRnRGraphQL } from '..';
import { RNR_FORM } from './keys';
import { useEffect, useState } from 'react';

export interface RnRFormQuery extends RnRFormFragment {
  lines: RnRFormLineFragment[];
}

const DEBOUNCE_TIME = 500;

export const useRnRForm = ({ rnrFormId }: { rnrFormId: string }) => {
  const { api, storeId } = useRnRGraphQL();
  const queryKey = [RNR_FORM, rnrFormId];

  const {
    mutateAsync: finalise,
    isLoading: isFinalising,
    error: finaliseError,
  } = useFinalise(rnrFormId);

  const { debouncedUpdateRnRForm } = useUpdate(rnrFormId);

  const queryFn = async (): Promise<RnRFormQuery | null> => {
    const query = await api.rAndRFormDetail({
      storeId,
      rnrFormId,
    });

    const result = query?.rAndRForm;
    return result.__typename === 'RnRFormNode' ? result : null;
  };

  const query = useQuery({ queryKey, queryFn });

  const [bufferedState, setBufferedState] = useState(query.data);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setBufferedState(query.data), [query.isFetched]);

  const updateRnRForm = (patch: {
    comment?: string;
    theirReference?: string;
  }) => {
    setBufferedState(state => (!state ? undefined : { ...state, ...patch }));
    debouncedUpdateRnRForm(patch);
  };

  return {
    query,
    finalise: { finalise, isFinalising, finaliseError },
    // updateLine: { updateLine },
    bufferedDetails: bufferedState,
    updateRnRForm,
    confirmRemainingLines: () => {},
  };
};

// MUTATIONS

export const useUpdateLines = (rnrFormId: string) => {
  const { api, storeId } = useRnRGraphQL();

  const mutationFn = async (lines: RnRFormLineFragment[]) => {
    const linesInput: UpdateRnRFormLineInput[] = lines.map(
      ({
        adjustedQuantityConsumed,
        adjustments,
        losses,
        averageMonthlyConsumption,
        confirmed,
        finalBalance,
        id,
        maximumQuantity,
        minimumQuantity,
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
        losses,
        adjustedQuantityConsumed,
        averageMonthlyConsumption,
        confirmed,
        finalBalance,
        minimumQuantity,
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
    const apiResult = await api.updateRnRForm({
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
    // onSuccess: () => queryClient.invalidateQueries([RNR_FORM])
    // Prevents duplication of error messages
    onError: () => {},
  });
};

const useUpdate = (id: string) => {
  const { api, storeId, queryClient } = useRnRGraphQL();

  const mutationFn = async ({
    theirReference,
    comment,
  }: Partial<UpdateRnRFormInput>) => {
    const apiResult = await api.updateRnRForm({
      input: {
        id,
        theirReference,
        comment,
        lines: [],
      },
      storeId,
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.updateRnrForm;

      if (result.__typename === 'RnRFormNode') {
        return result;
      }
    }

    throw new Error('Unable to update');
  };

  const { mutateAsync } = useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([RNR_FORM]),
  });

  const debouncedUpdateRnRForm = useDebounceCallback(
    mutateAsync,
    [],
    DEBOUNCE_TIME
  );

  return { debouncedUpdateRnRForm };
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
