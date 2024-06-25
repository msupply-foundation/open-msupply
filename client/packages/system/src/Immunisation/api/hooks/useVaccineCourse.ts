import { Dispatch, SetStateAction, useState } from 'react';
import {
  FnUtils,
  UpsertVaccineCourseItemInput,
  UpsertVaccineCourseScheduleInput,
  VaccineCourseScheduleNode,
  VaccineCourseSortFieldInput,
  isEmpty,
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

export enum UpdateVaccineCourseError {
  DatabaseError = 'Database Error',
  RecordProgramCombinationAlreadyExists = 'Course name already exists on this program',
}

export enum InsertVaccineCourseError {
  RecordAlreadyExist = 'Record already exists',
  RecordProgramCombinationAlreadyExists = 'Course name already exists on this program',
}

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
  ): UpsertVaccineCourseScheduleInput => {
    return {
      id: schedule.id,
      doseNumber: schedule.doseNumber,
      label: schedule.label,
    };
  },
  toItemInput: (item: DraftVaccineCourseItem): UpsertVaccineCourseItemInput => {
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
  } = useCreate(setErrorMessage);

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
    setIsDirty,
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

const useCreate = (setErrorMessage: Dispatch<SetStateAction<string>>) => {
  const { api, storeId, queryClient } = useImmunisationGraphQL();
  const t = useTranslation('coldchain');

  const mutationFn = async (input: DraftVaccineCourse) => {
    const apiResult = await api.insertVaccineCourse({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        name: input.name,
        programId: input.programId,
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
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.centralServer.vaccineCourse.insertVaccineCourse;

      if (result.__typename === 'VaccineCourseNode') {
        return result;
      }

      let message: string;
      switch (result.error.description) {
        case InsertVaccineCourseError.RecordAlreadyExist:
          message = t('error.database-error');
          setErrorMessage(message);
          throw new Error(
            `${t('error.unable-to-insert-vaccine-course')}: ${message}`
          );
        case InsertVaccineCourseError.RecordProgramCombinationAlreadyExists:
          message = t('error.name-program-duplicate');
          setErrorMessage(message);
          throw new Error(
            `${t('error.unable-to-insert-vaccine-course')}: ${message}`
          );
        default:
          throw new Error(`${t('error.unable-to-insert-vaccine-course')}`);
      }
    }

    throw new Error(t('error.unable-to-insert-vaccine-course'));
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

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.centralServer.vaccineCourse.updateVaccineCourse;

      if (result.__typename === 'VaccineCourseNode') {
        return result;
      }

      let message: string;
      switch (result.error.description) {
        case UpdateVaccineCourseError.DatabaseError:
          message = t('error.database-error');
          setErrorMessage(message);
          throw new Error(
            `${t('error.unable-to-update-vaccine-course')}: ${message}`
          );
        case UpdateVaccineCourseError.RecordProgramCombinationAlreadyExists:
          message = t('error.name-program-duplicate');
          setErrorMessage(message);
          throw new Error(
            `${t('error.unable-to-update-vaccine-course')}: ${message}`
          );
        default:
          throw new Error(`${t('error.unable-to-update-vaccine-course')}`);
      }
    }

    throw new Error(`${t('error.unable-to-update-vaccine-course')}`);
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([VACCINE]),
  });
};
