import {
  FnUtils,
  isEmpty,
  noOtherVariants,
  SchedulePeriodNode,
  useMutation,
} from '@openmsupply-client/common';
import {
  PeriodScheduleFragment,
  ProgramFragment,
} from '../operations.generated';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { RNR_FORM } from './keys';
import { useState } from 'react';
import { NameRowFragment } from '@openmsupply-client/system';

interface RnRFormDraft {
  supplier: NameRowFragment | null;
  program: ProgramFragment | null;
  schedule: PeriodScheduleFragment | null;
  period: SchedulePeriodNode | null;
}

export const useCreateRnRForm = () => {
  const { mutateAsync, isLoading, error } = useCreate();

  const [draft, setDraft] = useState<RnRFormDraft>({
    supplier: null,
    program: null,
    schedule: null,
    period: null,
  });

  const clearDraft = () => {
    setDraft({
      supplier: null,
      program: null,
      schedule: null,
      period: null,
    });
  };
  const updateDraft = (patch: Partial<RnRFormDraft>) => {
    setDraft({ ...draft, ...patch });
  };

  const isIncomplete =
    !draft.supplier || !draft.program || !draft.schedule || !draft.period;

  const create = async () => await mutateAsync(draft);

  return {
    draft,
    updateDraft,
    clearDraft,
    isIncomplete,
    isLoading,
    error,
    create,
  };
};

const useCreate = () => {
  const { api, storeId, queryClient } = useProgramsGraphQL();

  const mutationFn = async (draft: RnRFormDraft) => {
    if (!draft.supplier || !draft.program || !draft.schedule || !draft.period) {
      return;
    }

    const apiResult = await api.createRnRForm({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        supplierId: draft.supplier.id,
        periodId: draft.period.id,
        programId: draft.program.id,
      },
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.insertRnrForm;

      if (result.__typename === 'RnRFormNode') return result;

      if (result.__typename === 'InsertRnRFormError') {
        if (result.error.__typename === 'RecordAlreadyExist') {
          // setErrorMessage(t('error.program-already-exists'));
        } else {
          noOtherVariants(result.error.__typename);
        }
        return;
      }
    }

    throw new Error('Unable to create R&R Form');
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      // All forms need to be re-fetched to include the new one
      queryClient.invalidateQueries([RNR_FORM]),
  });
};
