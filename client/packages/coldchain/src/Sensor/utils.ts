import { SensorNodeType } from '@common/types';
import { SensorFragment } from './api';

export const isSensorNameEditDisabled = (sensor: SensorFragment) =>
  sensor.type === SensorNodeType.BlueMaestro || sensor.type === SensorNodeType.Laird;
