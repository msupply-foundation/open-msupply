import { SensorNodeType } from '@common/types';
import { SensorFragment } from './api';

export const isSensorNameEditable = (sensor: SensorFragment) =>
  sensor.type === SensorNodeType.Berlinger;
