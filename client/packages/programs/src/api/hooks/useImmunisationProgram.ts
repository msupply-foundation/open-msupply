import { Dispatch, SetStateAction, useState } from 'react';
import {
  FnUtils,
  LocaleKey,
  ProgramSortFieldInput,
  TypedTFunction,
  isEqual,
  noOtherVariants,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { IMMUNISATION_PROGRAM } from './keys';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { ImmunisationProgramFragment } from '../operations.generated';
import { isEmpty } from '@common/utils';

export interface DraftImmunisationProgram extends ImmunisationProgramFragment {}

const defaultDraftImmunisationProgram: DraftImmunisationProgram = {
  __typename: 'ProgramNode',
  id: '',
  name: '',
};

export function useImmunisationProgram(
  t: TypedTFunction<LocaleKey>,
  id?: string
) {
  const [patch, setPatch] = useState<Partial<DraftImmunisationProgram>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { data, isLoading, error } = useGet(id ?? '');
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate(setErrorMessage, t);

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate(id ?? '', setErrorMessage, t);

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
    query: { data, isLoading, error },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    draft,
    errorMessage,
    isDirty,
    updatePatch,
  };
}

const useGet = (id: string) => {
  const { api, storeId } = useProgramsGraphQL();

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
    queryKey: [IMMUNISATION_PROGRAM, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};

const useCreate = (
  setErrorMessage: Dispatch<SetStateAction<string>>,
  t: TypedTFunction<LocaleKey>
) => {
  const { api, storeId, queryClient } = useProgramsGraphQL();

  const mutationFn = async ({ name }: DraftImmunisationProgram) => {
    const apiResult = await api.insertImmunisationProgram({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        name,
      },
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.centralServer.program.insertImmunisationProgram;

      if (result.__typename === 'ProgramNode') return result;

      if (result.__typename === 'InsertImmunisationProgramError') {
        if (result.error.__typename === 'RecordAlreadyExist') {
          setErrorMessage(t('error.program-already-exists'));
        } else {
          noOtherVariants(result.error.__typename);
        }
        return;
      }
    }

    throw new Error('Unable to create Immunisation Program');
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      // All Programs need to be re-fetched to include the new one
      queryClient.invalidateQueries([IMMUNISATION_PROGRAM]),
  });
};

const useUpdate = (
  id: string,
  setErrorMessage: Dispatch<SetStateAction<string>>,
  t: TypedTFunction<LocaleKey>
) => {
  const { api, storeId, queryClient } = useProgramsGraphQL();

  const mutationFn = async ({ name }: Partial<DraftImmunisationProgram>) => {
    if (!name) {
      setErrorMessage(t('error.field-must-be-specified', { field: 'Name' }));
      return;
    }

    const apiResult = await api.updateImmunisationProgram({
      input: {
        id,
        name,
      },
      storeId,
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.centralServer.program.updateImmunisationProgram;

      if (result.__typename === 'ProgramNode') {
        return result;
      }

      if (result.__typename === 'UpdateImmunisationProgramError') {
        if (result.error.__typename === 'UniqueValueViolation') {
          setErrorMessage(
            t('error.unique-value-violation', { field: result.error.field })
          );
        } else {
          setErrorMessage(result.error.description);
        }
        return;
      }
    }

    throw new Error(t('error.unable-to-update-immunisation-program'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([IMMUNISATION_PROGRAM]),
  });
};
