import { Dispatch, SetStateAction, useState } from 'react';
import {
  FnUtils,
  UpdateVaccineCourseItemInput,
  UpdateVaccineCourseScheduleInput,
  VaccineCourseScheduleNode,
  VaccineCourseSortFieldInput,
  isEqual,
  useMutation,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { VACCINE } from './keys';
import { useImmunisationGraphQL } from '../useImmunisationGraphQL';
import { DraftVaccineCourse, DraftVaccineCourseItem } from './types';
// import { VaccineCourseFragment } from '../operations.generated';

// export interface DraftVaccineCourse extends VaccineCourseFragment {}

export interface DraftVaccineCourseSchedule extends VaccineCourseScheduleNode {}

const defaultDraftVaccineCourse: DraftVaccineCourse = {
  id: '',
  name: '',
  programId: '',
  doses: 1,
  coverageRate: 100,
  wastageRate: 0,
  isActive: true,
  vaccineCourseItems: [],
};

const vaccineCourseParsers = {
  toScheduleInput: (
    schedule: VaccineCourseScheduleNode
  ): UpdateVaccineCourseScheduleInput => {
    return {
      id: schedule.id,
      doseNumber: schedule.doseNumber,
      label: schedule.label,
    };
  },
  toItemInput: (item: DraftVaccineCourseItem): UpdateVaccineCourseItemInput => {
    return {
      id: item.id,
      itemId: item.itemId,
    };
  },
};

export const useVaccineCourse = (id?: string) => {
  const [patch, setPatch] = useState<Partial<DraftVaccineCourse>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { data, isLoading, error } = useGet(id ?? '');
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate(setErrorMessage);

  const draft: DraftVaccineCourse = data
    ? { ...defaultDraftVaccineCourse, ...data, ...patch }
    : { ...defaultDraftVaccineCourse, ...patch };

  const updatePatch = (newData: Partial<DraftVaccineCourse>) => {
    const newPatch = { ...patch, ...newData };
    setPatch(newPatch);

    // Ensures that UI doesn't show in "dirty" state if nothing actually
    // different from the saved data
    const updatedData = { ...data, ...newPatch };
    setIsDirty(!isEqual(data, updatedData));
  };

  const resetDraft = () => {
    if (data) {
      setPatch({});
      setIsDirty(false);
    }
  };

  const create = async (programId: string) => {
    const result = await createMutation({ ...draft, programId });
    setIsDirty(false);
    return result;
  };

  const update = async () => {
    const result = await updateMutation(draft);
    setIsDirty(false);
    return result;
  };

  return {
    query: { data: data, isLoading, error },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    errorMessage,
    draft,
    resetDraft,
    isDirty,
    updatePatch,
  };
};

const useGet = (id: string) => {
  const { api } = useImmunisationGraphQL();

  const queryFn = async () => {
    const result = await api.vaccineCourses({
      first: 1,
      offset: 0,
      key: VaccineCourseSortFieldInput.Name,
      desc: false,
      filter: { id: { equalTo: id } },
    });

    if (result.vaccineCourses.__typename === 'VaccineCourseConnector') {
      return result.vaccineCourses.nodes[0];
    }
  };

  const query = useQuery({
    queryKey: [VACCINE, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};

const useCreate = () => {
  const { api, storeId, queryClient } = useImmunisationGraphQL();

  const mutationFn = async ({ name, programId }: DraftVaccineCourse) => {
    return await api.insertVaccineCourse({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        name,
        programId,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([VACCINE]),
  });
};

const useUpdate = (setErrorMessage: Dispatch<SetStateAction<string>>) => {
  const { api, storeId, queryClient } = useImmunisationGraphQL();
  const t = useTranslation('coldchain');

  const mutationFn = async (input: DraftVaccineCourse) => {
    const apiResult = await api.updateVaccineCourse({
      input: {
        id: input.id,
        name: input.name,
        demographicIndicatorId: input.demographicIndicatorId,
        coverageRate: input.coverageRate,
        isActive: input.isActive,
        wastageRate: input.wastageRate,
        doses: input.doses,
        vaccineItems:
          input.vaccineCourseItems?.map(item =>
            vaccineCourseParsers.toItemInput(item)
          ) ?? [],
        schedules:
          input.vaccineCourseSchedules?.map(schedule =>
            vaccineCourseParsers.toScheduleInput(schedule)
          ) ?? [],
      },
      storeId,
    });

    const result = apiResult.centralServer?.vaccineCourse?.updateVaccineCourse; // `?` is needed as result type is incorrect when permission is denied

    if (result?.__typename === 'VaccineCourseNode') {
      return result;
    }

    if (result?.__typename === 'UpdateVaccineCourseError') {
      setErrorMessage(result.error.description);
      return;
    }

    throw new Error(t('error.unable-to-update-vaccine-course'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([VACCINE]),
  });
};
