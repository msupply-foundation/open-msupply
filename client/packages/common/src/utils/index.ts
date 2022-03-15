import { v4 } from 'uuid';
import { isEqual } from 'lodash';

export * from './numbers';
export * from './quantities';
export * from './formatters';
export * from './testing';
export * from './dates';
export * from './arrays';
export * from './regex';
export * from './pricing';
export * from './functions';
export * from './navigation';
export * from './environment';

export type UUID = string;

export const generateUUID = (): UUID => v4();

export const isTypeOf = <T>(
  variableToCheck: unknown,
  field: string
): variableToCheck is T => field in (variableToCheck as T);

export { isEqual };
