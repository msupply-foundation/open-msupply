import {
  FnUtils,
  isEmpty,
  SchedulePeriodNode,
  useMutation,
} from '@openmsupply-client/common';
import {
  PeriodScheduleFragment,
  ProgramFragment,
} from '../operations.generated';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { RNR_FORM } from './keys';
import { useEffect, useState } from 'react';
import { NameRowFragment } from '@openmsupply-client/system';
import { useRnRFormList } from '.';

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

  // TODO: probably needs to filter down to prog and sched so we can determine period!
  const { data } = useRnRFormList({
    sortBy: {
      key: 'createdDatetime',
      direction: 'desc',
    },
    filterBy: {
      periodScheduleId: { equalTo: draft.schedule?.id },
      programId: { equalTo: draft.program?.id },
    },
  });
  const previousForm = data?.nodes[0];

  // Default to the same supplier and program as most recent previous form, if exists
  useEffect(() => {
    if (previousForm && draft.supplier?.id !== previousForm.supplierId) {
      setDraft({
        ...draft,
        supplier: {
          id: previousForm.supplierId,
          name: previousForm.supplierName,
        } as NameRowFragment,
        program: {
          __typename: `ProgramNode`,
          id: previousForm.programId,
          name: previousForm.programName,
        },
      });
    }
  }, [!!previousForm]);

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
    previousForm,
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
