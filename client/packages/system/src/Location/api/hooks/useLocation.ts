import { useMutation, useTranslation } from '@openmsupply-client/common';
import { useLocationGraphQL } from '../useLocationGraphQL';
import { LOCATION } from './keys';
import { LocationRowFragment } from '../operations.generated';

export type DeleteError = {
  locationName: string;
  message: string;
};

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

  // DELETE
  const { deleteLocations } = useDeleteLocation();

  return {
    create: { create: createMutation, isCreating, createError },
    update: { update, isUpdating, updateError },
    delete: { delete: deleteLocations },
  };
};

const useCreateLocation = () => {
  const { locationApi, queryClient, storeId } = useLocationGraphQL();
  const t = useTranslation();

  const mutationFn = async (input: LocationRowFragment) => {
    const { id, code, name, onHold, locationType, volume } = input;

    const result = await locationApi.insertLocation({
      input: {
        id,
        code,
        name,
        onHold,
        locationTypeId: locationType?.id,
        volume,
      },
      storeId,
    });

    const { insertLocation } = result;
    if (insertLocation.__typename === 'InsertLocationError') {
      const { error } = insertLocation;
      if (error.__typename === 'UniqueValueViolation') {
        throw new Error(
          t('error.unique-value-violation', { field: error.field })
        );
      }
      throw new Error(error.description);
    }
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
  const t = useTranslation();

  const mutationFn = async (input: LocationRowFragment) => {
    const { id, code, name, onHold, locationType, volume } = input;

    const result = await locationApi.updateLocation({
      input: {
        id,
        code,
        name,
        onHold,
        locationTypeId: locationType?.id,
        volume,
      },
      storeId,
    });

    const { updateLocation } = result;
    if (updateLocation.__typename === 'UpdateLocationError') {
      const { error } = updateLocation;
      if (error.__typename === 'UniqueValueViolation') {
        throw new Error(
          t('error.unique-value-violation', { field: error.field })
        );
      }
      throw new Error(error.description);
    }
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

const useDeleteLocation = () => {
  const { locationApi, queryClient, storeId } = useLocationGraphQL();

  const mutationFn = async (id: string) => {
    const result = await locationApi.deleteLocation({
      input: { id },
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

  const deleteLocations = async (selectedRows: LocationRowFragment[]) => {
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
  };
};
