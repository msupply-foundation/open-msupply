import { useState } from 'react';
import {
  FnUtils,
  VaccineCourseSortFieldInput,
  isEqual,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { VACCINE } from './keys';
import { useImmunisationGraphQL } from '../useImmunisationGraphQL';
import { VaccineCourseFragment } from '../operations.generated';

export interface DraftVaccineCourse extends VaccineCourseFragment {}

const defaultDraftVaccineCourse: DraftVaccineCourse = {
  __typename: 'VaccineCourseNode',
  id: '',
  name: '',
  programId: '',
};

export function useVaccineCourse(id?: string) {
  const [patch, setPatch] = useState<Partial<DraftVaccineCourse>>({});
  const [isDirty, setIsDirty] = useState(false);
  const { data, isLoading, error } = useGet(id ?? '');
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const draft: DraftVaccineCourse = data
    ? { ...defaultDraftVaccineCourse, ...data, ...patch }
    : { ...defaultDraftVaccineCourse, ...patch };

  const updatePatch = (newData: Partial<DraftVaccineCourse>) => {
    const newPatch = { ...patch, ...newData };
    setPatch(newPatch);

    // Ensures that UI doesn't show in "dirty" state if nothing actually
    // different from the saved data
    const updatedData = { ...data, ...newPatch };
    if (isEqual(data, updatedData)) setIsDirty(false);
    else setIsDirty(true);
    return;
  };

  const resetDraft = () => {
    if (data) {
      setPatch({});
      setIsDirty(false);
    }
  };

  const create = async () => {
    const result = await createMutation(draft);
    setIsDirty(false);
    return result;
  };

  return {
    query: { data: data, isLoading, error },
    create: { create, isCreating, createError },
    draft,
    resetDraft,
    isDirty,
    updatePatch,
  };
}

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

  const mutationFn = async ({ name }: DraftVaccineCourse) => {
    return await api.insertVaccineCourse({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        name,
        programId: 'missing_program',
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([VACCINE]),
  });
};
