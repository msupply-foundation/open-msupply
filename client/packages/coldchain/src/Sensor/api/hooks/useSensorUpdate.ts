import { UpdateSensorInput } from '@common/types';
import { setNullableInput, useMutation } from '@openmsupply-client/common';
import { SENSOR } from './keys';
import { useSensorGraphQL } from '../useSensorGraphQL';
import { SensorFragment } from '../operations.generated';

export const useSensorUpdate = () => {
  const { sensorApi, storeId, queryClient } = useSensorGraphQL();

  const mutationFn = async (sensor: SensorFragment) => {
    const input: UpdateSensorInput = {
      id: sensor.id,
      isActive: sensor.isActive,
      name: sensor.name,
      locationId: setNullableInput('id', sensor.location),
    };

    const result = await sensorApi.updateSensor({
      input,
      storeId,
    });

    return result?.updateSensor;
  };

  const invalidateQueries = () => queryClient.invalidateQueries([SENSOR]);

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([SENSOR]);
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
