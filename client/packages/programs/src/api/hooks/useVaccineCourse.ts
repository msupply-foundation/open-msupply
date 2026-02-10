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
  RecordProgramCombinationAlreadyExists = 'RecordProgramCombinationAlreadyExists',
  VaccineDosesInUse = 'VaccineDosesInUse',
}

enum InsertVaccineCourseError {
  RecordAlreadyExist = 'RecordAlreadyExist',
  RecordProgramCombinationAlreadyExists = 'RecordProgramCombinationAlreadyExists',
}

const defaultDraftVaccineCourse: DraftVaccineCourse = {
  id: '',
  name: '',
  programId: '',
  coverageRate: 100,
  wastageRate: 0,
  useInGapsCalculations: true,
  canSkipDose: false,
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
  const { data, isLoading, error } = useGet(id ?? '');
  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<DraftVaccineCourse>(data ?? {});
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

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

const useCreate = () => {
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
        useInGapsCalculations: input.useInGapsCalculations,
        canSkipDose: input.canSkipDose,
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

      switch (result.error.__typename) {
        case InsertVaccineCourseError.RecordAlreadyExist:
          throw new Error(t('error.database-error'));
        case InsertVaccineCourseError.RecordProgramCombinationAlreadyExists:
          throw new Error(t('error.name-program-duplicate'));
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

const useUpdate = () => {
  const { api, storeId, queryClient } = useProgramsGraphQL();
  const t = useTranslation();

  const mutationFn = async (input: DraftVaccineCourse) => {
    const apiResult = await api.updateVaccineCourse({
      input: {
        id: input.id,
        name: input.name,
        demographicId: input.demographicId,
        coverageRate: input.coverageRate,
        useInGapsCalculations: input.useInGapsCalculations,
        canSkipDose: input.canSkipDose,
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

      switch (result.error.__typename) {
        case UpdateVaccineCourseError.RecordProgramCombinationAlreadyExists:
          throw new Error(t('error.name-program-duplicate'));
        case UpdateVaccineCourseError.VaccineDosesInUse:
          throw new Error(t('error.vaccine-dose-in-use'));
        default:
          throw new Error(t('error.failed-to-save-vaccine-course'));
      }
    }

    throw new Error(t('error.failed-to-save-vaccine-course'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([VACCINE]),
  });
};
