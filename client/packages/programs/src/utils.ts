import { ProgramEventFragment } from './api';

/**
 * Finds all events that are status events and return their data
 */
export const getStatusEventData = (events: ProgramEventFragment[]): string[] =>
  events
    .filter(e => e.type?.startsWith('status'))
    .map(e => e.data)
    .filter((data): data is string => !!data);
