import { Dispatch, SetStateAction, useState } from 'react';
import {
  FnUtils,
  UpsertVaccineCourseItemInput,
  UpsertVaccineCourseDoseInput,
  VaccineCourseSortFieldInput,
  isEmpty,
  useMutation,
  useQuery,
  useTranslation,
  usePatchState,
} from '@openmsupply-client/common';
import { VACCINE } from './keys';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { DraftVaccineCourse, DraftVaccineCourseItem } from './types';
import { VaccineCourseDoseFragment } from '../operations.generated';

enum UpdateVaccineCourseError {
  DatabaseError = 'Database Error',
  RecordProgramCombinationAlreadyExists = 'Course name already exists on this program',
}

enum InsertVaccineCourseError {
  RecordAlreadyExist = 'Record already exists',
  RecordProgramCombinationAlreadyExists = 'Course name already exists on this program',
}

const defaultDraftVaccineCourse: DraftVaccineCourse = {
  id: '',
  name: '',
  programId: '',
  coverageRate: 100,
  wastageRate: 0,
  isActive: true,
  vaccineCourseItems: [],
};

const vaccineCourseParsers = {
  toDoseInput: (
    dose: VaccineCourseDoseFragment
  ): UpsertVaccineCourseDoseInput => {
    return {
      id: dose.id,
      label: dose.label,
      minAge: dose.minAgeMonths,
      maxAge: dose.maxAgeMonths,
      minIntervalDays: dose.minIntervalDays,
      customAgeLabel: dose.customAgeLabel,
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
  const [errorMessage, setErrorMessage] = useState('');
  const { data, isLoading, error } = useGet(id ?? '');
  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<DraftVaccineCourse>(data ?? {});
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

  const create = async (programId: string) => {
    const result = await createMutation({ ...draft, programId });
    resetDraft();
    return result;
  };

  const update = async () => {
    const result = await updateMutation(draft);
    resetDraft();
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
  const { api } = useProgramsGraphQL();

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
  const { api, storeId, queryClient } = useProgramsGraphQL();
  const t = useTranslation();

  const mutationFn = async (input: DraftVaccineCourse) => {
    const apiResult = await api.insertVaccineCourse({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        name: input.name,
        programId: input.programId,
        demographicId: input.demographicId,
        coverageRate: input.coverageRate,
        isActive: input.isActive,
        wastageRate: input.wastageRate,
        vaccineItems:
          input.vaccineCourseItems?.map(item =>
            vaccineCourseParsers.toItemInput(item)
          ) ?? [],
        doses:
          input.vaccineCourseDoses?.map(dose =>
            vaccineCourseParsers.toDoseInput(dose)
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
          throw new Error(t('error.unable-to-insert-vaccine-course'));
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
  const { api, storeId, queryClient } = useProgramsGraphQL();
  const t = useTranslation();

  const mutationFn = async (input: DraftVaccineCourse) => {
    const apiResult = await api.updateVaccineCourse({
      input: {
        id: input.id,
        name: input.name,
        demographicId: input.demographicId,
        coverageRate: input.coverageRate,
        isActive: input.isActive,
        wastageRate: input.wastageRate,
        vaccineItems:
          input.vaccineCourseItems?.map(item =>
            vaccineCourseParsers.toItemInput(item)
          ) ?? [],
        doses:
          input.vaccineCourseDoses?.map(dose =>
            vaccineCourseParsers.toDoseInput(dose)
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
          throw new Error(t('error.unable-to-update-vaccine-course'));
      }
    }

    throw new Error(t('error.unable-to-update-vaccine-course'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([VACCINE]),
  });
};
