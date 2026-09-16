import { UpdateSensorInput } from '@common/types';
import { setNullableInput, useMutation } from '@openmsupply-client/common';
import { SENSOR } from './keys';
import { TEMPERATURE_NOTIFICATION } from '../../../Monitoring/api/TemperatureNotification';
import { useSensorGraphQL } from '../useSensorGraphQL';
import { SensorFragment } from '../operations.generated';

/** The editor's draft alongside the sensor it was seeded from, so the update
 * can carry the difference rather than the whole record. */
export interface SensorUpdate {
  draft: SensorFragment;
  seed: SensorFragment;
}

export const useSensorUpdate = () => {
  const { sensorApi, storeId, queryClient } = useSensorGraphQL();

  // Only the fields the editor actually changed. Every field of
  // UpdateSensorInput but `id` is optional and absence means "leave this
  // alone", so sending the whole draft writes back values the user never
  // touched — silently undoing whatever a second session changed while this
  // modal sat open (a rename here would put the sensor back on the fridge
  // someone else had just moved it off, with nothing on screen to say so).
  const mutationFn = async ({ draft, seed }: SensorUpdate) => {
    const input: UpdateSensorInput = { id: draft.id };

    if (draft.name !== seed.name) input.name = draft.name;
    if (draft.isActive !== seed.isActive) input.isActive = draft.isActive;
    // The one field that must still be sent when it changes to "none": an
    // absent locationId reads as unchanged, not as cleared.
    if ((draft.location?.id ?? null) !== (seed.location?.id ?? null))
      input.locationId = setNullableInput('id', draft.location);

    const result = await sensorApi.updateSensor({
      input,
      storeId,
    });

    return result?.updateSensor;
  };

  const invalidateQueries = () => queryClient.invalidateQueries({
    queryKey: [SENSOR]
  });

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SENSOR] });
      queryClient.invalidateQueries({ queryKey: [TEMPERATURE_NOTIFICATION] });
    },
    onError: e => {
      console.error(e);
    },
  });

  return {
    ...mutation,
    invalidateQueries,
  };
};
