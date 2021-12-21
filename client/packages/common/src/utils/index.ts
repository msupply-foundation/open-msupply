import { v4 } from 'uuid';

export * from './formatters';
export * from './testing';
export * from './debounce';
export * from './dateFunctions';
export * from './arrays';

export type UUID = string;

export const generateUUID = (): UUID => v4();

// Using isProduction rather than isDevelopment, as we also use a testing
// environment while running jest, so easier to check !isProduction, generally.
export const isProduction = (): boolean =>
  process.env['NODE_ENV'] === 'production';
