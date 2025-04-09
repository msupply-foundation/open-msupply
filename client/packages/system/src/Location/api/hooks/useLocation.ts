import { useMutation } from '@openmsupply-client/common';
import { useLocationGraphQL } from '../useLocationGraphQL';
import { LOCATION } from './keys';
import { LocationRowFragment } from '../operations.generated';

export const useLocation = () => {
  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreateLocation();

  // UPDATE
  const {
    mutateAsync: update,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdateLocation();

  return {
    create: {
      create: createMutation,
      isCreating,
      createError,
    },
    update: {
      update,
      isUpdating,
      updateError,
    },
  };
};

const useCreateLocation = () => {
  const { locationApi, queryClient, storeId } = useLocationGraphQL();

  const mutationFn = async (input: LocationRowFragment) => {
    const { id, code, name, onHold, coldStorageType } = input;

    await locationApi.insertLocation({
      input: {
        id,
        code,
        name,
        onHold,
        coldStorageTypeId: coldStorageType?.id,
      },
      storeId,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([LOCATION]);
    },
    onError: e => {
      console.error(e);
    },
  });
};

const useUpdateLocation = () => {
  const { locationApi, queryClient, storeId } = useLocationGraphQL();

  const mutationFn = async (input: LocationRowFragment) => {
    const { id, code, name, onHold, coldStorageType } = input;

    await locationApi.updateLocation({
      input: {
        id,
        code,
        name,
        onHold,
        coldStorageTypeId: coldStorageType?.id,
      },
      storeId,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([LOCATION]);
    },
    onError: e => {
      console.error(e);
    },
  });
};
