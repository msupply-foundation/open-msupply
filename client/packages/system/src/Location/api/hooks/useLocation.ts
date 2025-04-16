import { useMutation, useTableStore } from '@openmsupply-client/common';
import { useLocationGraphQL } from '../useLocationGraphQL';
import { LOCATION } from './keys';
import { LocationRowFragment } from '../operations.generated';

export type DeleteError = {
  locationName: string;
  message: string;
};

export const useLocation = (locations?: LocationRowFragment[]) => {
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

  // DELETE
  const { deleteLocations, selectedRows } = useDeleteLocation(locations);

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
    delete: {
      delete: deleteLocations,
      selectedRows,
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

const useDeleteLocation = (locations?: LocationRowFragment[]) => {
  const { locationApi, queryClient, storeId } = useLocationGraphQL();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => locations?.find(({ id }) => selectedId === id))
      .filter(Boolean) as LocationRowFragment[],
  }));

  const mutationFn = async (id: string) => {
    const result = await locationApi.deleteLocation({
      input: {
        id,
      },
      storeId,
    });
    return result.deleteLocation;
  };

  const { mutateAsync: deleteMutation } = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([LOCATION]);
    },
  });

  const deleteLocations = async () => {
    const deleteErrors: DeleteError[] = [];

    await Promise.all(
      selectedRows.map(async location => {
        const data = await deleteMutation(location.id);
        if (data?.__typename === 'DeleteLocationError') {
          deleteErrors.push({
            locationName: location.name,
            message: data?.error?.description ?? '',
          });
        }
      })
    );
    return deleteErrors;
  };

  return {
    deleteLocations,
    selectedRows,
  };
};
