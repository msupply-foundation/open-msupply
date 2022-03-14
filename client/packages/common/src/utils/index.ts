import { v4 } from 'uuid';
import { isEqual } from 'lodash';

export * from './numbers';
export * from './quantities';
export * from './formatters';
export * from './testing';
export * from './debounce';
export * from './dates';
export * from './arrays';
export * from './regex';

export type UUID = string;

export const generateUUID = (): UUID => v4();

// Using isProduction rather than isDevelopment, as we also use a testing
// environment while running jest, so easier to check !isProduction, generally.
export const isProduction = (): boolean =>
  process.env['NODE_ENV'] === 'production';

export const isTypeOf = <T>(
  variableToCheck: unknown,
  field: string
): variableToCheck is T => field in (variableToCheck as T);

export { isEqual };
