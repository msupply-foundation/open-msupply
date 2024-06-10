import { Dispatch, SetStateAction, useState } from 'react';
import {
  FnUtils,
  ProgramSortFieldInput,
  isEqual,
  useMutation,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { PROGRAM } from './keys';
import { useImmunisationGraphQL } from '../useImmunisationGraphQL';
import { ImmunisationProgramFragment } from '../operations.generated';

export interface DraftImmunisationProgram extends ImmunisationProgramFragment {}

const defaultDraftImmunisationProgram: DraftImmunisationProgram = {
  __typename: 'ProgramNode',
  id: '',
  name: '',
};

export function useImmunisationProgram(id?: string) {
  const [patch, setPatch] = useState<Partial<DraftImmunisationProgram>>({});
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
  } = useUpdate(id ?? '', setErrorMessage);

  const draft: DraftImmunisationProgram = data
    ? { ...defaultDraftImmunisationProgram, ...data, ...patch }
    : { ...defaultDraftImmunisationProgram, ...patch };

  const updatePatch = (newData: Partial<DraftImmunisationProgram>) => {
    const newPatch = { ...patch, ...newData };
    setPatch(newPatch);
    // Reset error message if user is trying to fix the error
    setErrorMessage('');

    // Ensures that UI doesn't show in "dirty" state if nothing actually
    // different from the saved data
    const updatedData = { ...data, ...newPatch };
    if (isEqual(data, updatedData)) setIsDirty(false);
    else setIsDirty(true);
    return;
  };

  const create = async () => {
    const result = await createMutation(draft);
    setIsDirty(false);
    return result;
  };

  const update = async () => {
    updateMutation(patch);
    setIsDirty(false);
  };

  return {
    query: { data: data, isLoading, error },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    draft,
    errorMessage,
    isDirty,
    updatePatch,
  };
}

const useGet = (id: string) => {
  const { api, storeId } = useImmunisationGraphQL();

  const queryFn = async () => {
    const result = await api.programs({
      storeId,
      first: 1,
      offset: 0,
      key: ProgramSortFieldInput.Name,
      desc: false,
      filter: { id: { equalTo: id } },
    });

    if (result.programs.__typename === 'ProgramConnector') {
      return result.programs.nodes[0];
    }
  };

  const query = useQuery({
    queryKey: [PROGRAM, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};

const useCreate = () => {
  const { api, storeId, queryClient } = useImmunisationGraphQL();

  const mutationFn = async ({ name }: DraftImmunisationProgram) => {
    return await api.insertImmunisationProgram({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        name,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      // All Programs need to be re-fetched to include the new one
      queryClient.invalidateQueries([PROGRAM]),
  });
};

const useUpdate = (
  id: string,
  setErrorMessage: Dispatch<SetStateAction<string>>
) => {
  const { api, storeId, queryClient } = useImmunisationGraphQL();
  const t = useTranslation('system');

  const mutationFn = async ({ name }: Partial<DraftImmunisationProgram>) => {
    if (!id) {
      throw new Error('No ID provided to update Immunisation Program');
    }
    if (!name) {
      throw new Error('No name provided to update Immunisation Program');
    }

    const apiResult = await api.updateImmunisationProgram({
      input: {
        id,
        name,
      },
      storeId,
    });

    const result = apiResult.centralServer.program.updateImmunisationProgram;

    if (result?.__typename === 'ProgramNode') {
      return result;
    }

    if (result?.__typename === 'UpdateImmunisationProgramError') {
      if (result.error.__typename === 'UniqueValueViolation') {
        setErrorMessage(
          t('error.unique-value-violation', { field: result.error.field })
        );
      } else {
        setErrorMessage(result.error.description);
      }
      return;
    }

    throw new Error('Unable to update Immunisation Program');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([PROGRAM]),
  });
};
